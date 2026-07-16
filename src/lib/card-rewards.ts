import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";
import { cardDrops, cards, db, decks } from "@/lib/db";
import type { GameForPlayPage } from "@/lib/db/store/game.store";
import { getEligibleCardRewardUserIds } from "@/lib/card-reward-eligibility";
import {
  drawCardCandidates as drawCandidatesByRarity,
  type CollectibleCardViewModel,
  type DeckOdds,
} from "@/lib/card-catalog";
import {
  listEligibleCardCandidates,
  viewModelForPulledCard,
  type EligibleCardCandidate,
} from "@/lib/collectible-cards";
import { areCardsEnabled } from "@/lib/db/store/feature-flags.store";

export const CARD_PACK_SIZE = 5;
export const STANDARD_DECK_NAME = "standard";

export type UnopenedCardPackGroup = {
  deckName: string;
  deckLabel: string;
  description: string;
  packCount: number;
  cardsPerPack: number;
};

function deckOdds(deck: typeof decks.$inferSelect): DeckOdds {
  return {
    common: deck.commonOdds,
    uncommon: deck.uncommonOdds,
    rare: deck.rareOdds,
    legendary: deck.legendaryOdds,
  };
}

export function drawCardCandidates(input: {
  candidates: EligibleCardCandidate[];
  odds: DeckOdds;
  count: number;
  random?: () => number;
}) {
  return drawCandidatesByRarity({
    ...input,
    candidates: input.candidates.map((candidate) => ({
      ...candidate,
      rarity: candidate.template.rarity,
    })),
  });
}

export async function grantCardPacksForCompletedGame(
  game: Pick<GameForPlayPage, "id" | "gameTitle" | "players">,
) {
  if (!(await areCardsEnabled())) return [];

  const configuredDeckName = game.gameTitle?.rewardDeckName ?? STANDARD_DECK_NAME;
  const configuredDeck = await db.query.decks.findFirst({
    where: and(eq(decks.name, configuredDeckName), eq(decks.isActive, true)),
  });
  const deck =
    configuredDeck ??
    (await db.query.decks.findFirst({ where: eq(decks.name, STANDARD_DECK_NAME) }));
  const eligibleUserIds = getEligibleCardRewardUserIds(game.players);
  if (eligibleUserIds.length < 2) return [];

  return db.transaction(async (tx) => {
    const activeDeck =
      deck ??
      (
        await tx
          .insert(decks)
          .values({ name: STANDARD_DECK_NAME, label: "Standard" })
          .onConflictDoNothing()
          .returning()
      )[0] ??
      (await tx.query.decks.findFirst({ where: eq(decks.name, STANDARD_DECK_NAME) }));
    if (!activeDeck) throw new Error("Standard card deck is unavailable");

    return tx
      .insert(cardDrops)
      .values(
        eligibleUserIds.map((userId) => ({
          userId,
          gameId: game.id,
          deckName: activeDeck.name,
          cardCount: activeDeck.packSize,
        })),
      )
      .onConflictDoNothing()
      .returning();
  });
}

export async function getUnopenedCardDropForUser(input: {
  userId: string;
  gameId?: string | null;
  deckName?: string | null;
}) {
  if (!(await areCardsEnabled())) return null;

  const conditions = [eq(cardDrops.userId, input.userId), isNull(cardDrops.openedAt)];
  if (input.gameId) conditions.push(eq(cardDrops.gameId, input.gameId));
  if (input.deckName) conditions.push(eq(cardDrops.deckName, input.deckName));
  return (
    (await db.query.cardDrops.findFirst({
      where: and(...conditions),
      orderBy: [asc(cardDrops.createdAt)],
      with: { deck: true },
    })) ?? null
  );
}

export async function getCardDropForUserByGame(input: { userId: string; gameId: string }) {
  if (!(await areCardsEnabled())) return null;

  return (
    (await db.query.cardDrops.findFirst({
      where: and(eq(cardDrops.userId, input.userId), eq(cardDrops.gameId, input.gameId)),
      with: { deck: true },
    })) ?? null
  );
}

export async function listUnopenedCardPackGroups(userId: string) {
  if (!(await areCardsEnabled())) return [];

  const drops = await db.query.cardDrops.findMany({
    where: and(eq(cardDrops.userId, userId), isNull(cardDrops.openedAt)),
    orderBy: [asc(cardDrops.createdAt)],
    with: { deck: true },
  });
  const groups = new Map<string, UnopenedCardPackGroup>();
  for (const drop of drops) {
    if (!drop.deckName || !drop.deck) continue;
    const current = groups.get(drop.deckName);
    groups.set(drop.deckName, {
      deckName: drop.deckName,
      deckLabel: drop.deck.label,
      description: drop.deck.description,
      packCount: (current?.packCount ?? 0) + 1,
      cardsPerPack: drop.cardCount,
    });
  }
  return Array.from(groups.values());
}

export const grantSkyjoPacksForCompletedGame = grantCardPacksForCompletedGame;

export async function openCardDropForUser(input: {
  cardDropId: string;
  userId: string;
}): Promise<CollectibleCardViewModel[]> {
  if (!(await areCardsEnabled())) {
    throw new Error("Card packs are not available yet");
  }

  const pendingDrop = await db.query.cardDrops.findFirst({
    where: and(
      eq(cardDrops.id, input.cardDropId),
      eq(cardDrops.userId, input.userId),
      isNull(cardDrops.openedAt),
    ),
    with: { deck: true },
  });
  if (!pendingDrop?.deckName || !pendingDrop.deck) {
    const existing = await db.query.cardDrops.findFirst({ where: eq(cardDrops.id, input.cardDropId) });
    if (!existing || existing.userId !== input.userId) throw new Error("Card pack not found");
    if (existing.openedAt) throw new Error("This card pack has already been opened");
    throw new Error("This card pack has no deck");
  }

  const candidates = await listEligibleCardCandidates({
    userId: input.userId,
    deckName: pendingDrop.deckName,
  });
  const draws = drawCardCandidates({
    candidates,
    odds: deckOdds(pendingDrop.deck),
    count: pendingDrop.cardCount,
  });

  const inserted = await db.transaction(async (tx) => {
    const [claimedDrop] = await tx
      .update(cardDrops)
      .set({ openedAt: new Date().toISOString() })
      .where(
        and(
          eq(cardDrops.id, input.cardDropId),
          eq(cardDrops.userId, input.userId),
          isNull(cardDrops.openedAt),
        ),
      )
      .returning();
    if (!claimedDrop) throw new Error("This card pack has already been opened");

    return tx
      .insert(cards)
      .values(
        draws.map(({ candidate, rarity }) => ({
          ownerId: input.userId,
          deckName: candidate.template.deckName,
          cardTemplateId: candidate.template.id,
          rarity,
          subjectType: candidate.subjectType,
          subjectId: candidate.subjectId,
          value: 0,
          suit: "CATALOG",
          weight: 0,
          modifier: "Basic",
          probability: 0,
          suitProbability: 0,
        })),
      )
      .returning();
  });

  return inserted.map((card, index) =>
    viewModelForPulledCard({
      candidate: draws[index]!.candidate,
      instanceId: card.id,
      rarity: card.rarity ?? draws[index]!.rarity,
    }),
  );
}
