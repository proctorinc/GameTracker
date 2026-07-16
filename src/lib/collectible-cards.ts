import "server-only";

import type { CardRarity, CardSubjectType } from "@/lib/db/schema";
import {
  getCardIdentityKey,
  parseCardRendererConfig,
  type CollectibleCardSubject,
  type CollectibleCardViewModel,
} from "@/lib/card-catalog";
import { listAcceptedFriendsForUser } from "@/lib/db/store/friendship.store";
import { listPlayedGameTitleSummaries } from "@/lib/db/store/game.store";
import { getCardsByOwnerId } from "@/lib/db/store/cards.store";
import { listCardTemplates } from "@/lib/db/store/card-templates.store";

type TemplateWithDeck = Awaited<ReturnType<typeof listCardTemplates>>[number];

export type EligibleCardCandidate = {
  identityKey: string;
  template: TemplateWithDeck;
  subjectType: CardSubjectType | null;
  subjectId: string | null;
  subject: CollectibleCardSubject | null;
};

function userDisplayName(user: { firstName: string | null; lastName: string | null }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "Friend";
}

export async function listEligibleCardCandidates(input: {
  userId: string;
  deckName?: string;
  includeInactive?: boolean;
}): Promise<EligibleCardCandidate[]> {
  const templates = await listCardTemplates({
    deckName: input.deckName,
    activeOnly: !input.includeInactive,
  });
  const needsFriends = templates.some((template) => template.renderer === "friend_profile");
  const needsTitles = templates.some((template) => template.renderer === "played_title");
  const [friends, titles] = await Promise.all([
    needsFriends ? listAcceptedFriendsForUser(input.userId) : [],
    needsTitles ? listPlayedGameTitleSummaries(input.userId) : [],
  ]);

  return templates.flatMap((template): EligibleCardCandidate[] => {
    if (!input.includeInactive && !template.deck.isActive) return [];
    if (template.renderer === "friend_profile") {
      return friends
        .filter((friend) => !friend.isGuest && !friend.mergedIntoUserId)
        .map((friend) => ({
          identityKey: getCardIdentityKey({
            cardTemplateId: template.id,
            subjectType: "friend",
            subjectId: friend.id,
          }),
          template,
          subjectType: "friend",
          subjectId: friend.id,
          subject: {
            type: "friend",
            id: friend.id,
            name: userDisplayName(friend),
            avatarUrl: friend.avatarUrl,
            color: friend.color,
          },
        }));
    }
    if (template.renderer === "played_title") {
      return titles.map((title) => ({
        identityKey: getCardIdentityKey({
          cardTemplateId: template.id,
          subjectType: "game_title",
          subjectId: title.id,
        }),
        template,
        subjectType: "game_title",
        subjectId: title.id,
        subject: {
          type: "game_title",
          id: title.id,
          name: title.title,
          imageUrl: title.imageUrl,
          color: title.color,
        },
      }));
    }
    return [
      {
        identityKey: getCardIdentityKey({ cardTemplateId: template.id }),
        template,
        subjectType: null,
        subjectId: null,
        subject: null,
      },
    ];
  });
}

function toViewModel(input: {
  candidate: EligibleCardCandidate;
  instanceId?: string | null;
  rarity?: CardRarity;
  quantity?: number;
  collected?: boolean;
  unavailable?: boolean;
}): CollectibleCardViewModel {
  const { template } = input.candidate;
  return {
    instanceId: input.instanceId ?? null,
    identityKey: input.candidate.identityKey,
    deckName: template.deckName,
    deckLabel: template.deck.label,
    templateId: template.id,
    templateSlug: template.slug,
    name: template.name,
    description: template.description,
    rarity: input.rarity ?? template.rarity,
    renderer: template.renderer,
    config: parseCardRendererConfig(template.renderer, template.configJson),
    subjectType: input.candidate.subjectType,
    subjectId: input.candidate.subjectId,
    subject: input.candidate.subject,
    unavailable: input.unavailable ?? false,
    collected: input.collected ?? false,
    quantity: input.quantity ?? 0,
  };
}

export type CardCollectionDeckView = {
  deckName: string;
  deckLabel: string;
  totalCards: number;
  collectedSlots: number;
  eligibleSlots: number;
  slots: CollectibleCardViewModel[];
};

export async function getCardCollectionForOwner(
  ownerId: string,
): Promise<CardCollectionDeckView[]> {
  const ownedCards = await getCardsByOwnerId(ownerId);
  const ownedDeckNames = Array.from(new Set(ownedCards.map((card) => card.deckName)));
  if (ownedDeckNames.length === 0) return [];

  const candidates = (
    await Promise.all(
      ownedDeckNames.map((deckName) =>
        listEligibleCardCandidates({ userId: ownerId, deckName }),
      ),
    )
  ).flat();
  const allResolvedCandidates = (
    await Promise.all(
      ownedDeckNames.map((deckName) =>
        listEligibleCardCandidates({ userId: ownerId, deckName, includeInactive: true }),
      ),
    )
  ).flat();
  const candidateByIdentity = new Map(
    allResolvedCandidates.map((candidate) => [candidate.identityKey, candidate]),
  );
  const activeIdentityKeys = new Set(candidates.map((candidate) => candidate.identityKey));
  const ownedByIdentity = new Map<
    string,
    { cards: typeof ownedCards; quantity: number }
  >();
  for (const card of ownedCards) {
    const key = getCardIdentityKey(card);
    const current = ownedByIdentity.get(key) ?? { cards: [], quantity: 0 };
    current.cards.push(card);
    current.quantity += 1;
    ownedByIdentity.set(key, current);
  }

  return ownedDeckNames.map((deckName) => {
    const deckCandidates = candidates.filter((candidate) => candidate.template.deckName === deckName);
    const activeSlots = deckCandidates.map((candidate) => {
      const owned = ownedByIdentity.get(candidate.identityKey);
      return toViewModel({
        candidate,
        instanceId: owned?.cards[0]?.id,
        rarity: owned?.cards[0]?.rarity,
        quantity: owned?.quantity,
        collected: Boolean(owned),
      });
    });
    const unavailableSlots = Array.from(ownedByIdentity.entries())
      .filter(([key, owned]) =>
        owned.cards[0]?.deckName === deckName && !activeIdentityKeys.has(key),
      )
      .map(([identityKey, owned]) => {
        const card = owned.cards[0]!;
        const resolvedCandidate = candidateByIdentity.get(identityKey);
        const candidate: EligibleCardCandidate =
          resolvedCandidate ?? {
            identityKey,
            template: { ...card.template, deck: card.deck } as TemplateWithDeck,
            subjectType: card.subjectType,
            subjectId: card.subjectId,
            subject: null,
          };
        return toViewModel({
          candidate,
          instanceId: card.id,
          rarity: card.rarity,
          quantity: owned.quantity,
          collected: true,
          unavailable: Boolean(card.subjectType && !resolvedCandidate),
        });
      });
    const slots = [...activeSlots, ...unavailableSlots];
    return {
      deckName,
      deckLabel: ownedCards.find((card) => card.deckName === deckName)!.deck.label,
      totalCards: ownedCards.filter((card) => card.deckName === deckName).length,
      collectedSlots: activeSlots.filter((slot) => slot.collected).length,
      eligibleSlots: activeSlots.length,
      slots,
    };
  });
}

export function viewModelForPulledCard(input: {
  candidate: EligibleCardCandidate;
  instanceId: string;
  rarity: CardRarity;
}) {
  return toViewModel({
    candidate: input.candidate,
    instanceId: input.instanceId,
    rarity: input.rarity,
    quantity: 1,
    collected: true,
  });
}
