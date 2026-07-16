import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createUserFixture } from "../fixtures/users";
import { withTestDatabase } from "../helpers/test-db";

vi.mock("server-only", () => ({}));

async function createGameFixture(input: {
  normalizedTitle: string;
  playerUserIds: string[];
  rewardDeckName?: string | null;
}) {
  const { db, gamePlayers, games, gameTitle } = await import("@/lib/db");
  const [title] = await db
    .insert(gameTitle)
    .values({
      title: input.normalizedTitle,
      normalizedTitle: input.normalizedTitle,
      rewardDeckName: input.rewardDeckName ?? null,
    })
    .returning();
  const [game] = await db
    .insert(games)
    .values({
      creatorId: input.playerUserIds[0]!,
      gameTitleId: title.id,
    })
    .returning();

  await db.insert(gamePlayers).values(
    input.playerUserIds.map((userId) => ({
      gameId: game.id,
      userId,
    })),
  );

  const { getGameForPlayPage } = await import("@/lib/db/store/game.store");
  const fullGame = await getGameForPlayPage(game.id);
  if (!fullGame) throw new Error("Missing card reward game fixture");
  return fullGame;
}

describe("card rewards", () => {
  afterEach(() => vi.resetModules());

  it("uses Skyjo's custom deck and ignores guest participants", async () => {
    await withTestDatabase(async () => {
      const { seedCardCatalog } = await import("@/lib/card-catalog-seed");
      await seedCardCatalog();
      const first = await createUserFixture();
      const second = await createUserFixture();
      const guest = await createUserFixture({ isGuest: true });
      const game = await createGameFixture({
        normalizedTitle: "skyjo",
        rewardDeckName: "skyjo",
        playerUserIds: [first.id, second.id, guest.id],
      });
      const { grantCardPacksForCompletedGame } = await import(
        "@/lib/card-rewards"
      );
      const { getCardDropsByGameId } = await import(
        "@/lib/db/store/card-drops.store"
      );

      await grantCardPacksForCompletedGame(game);
      await grantCardPacksForCompletedGame(game);
      const drops = await getCardDropsByGameId(game.id);

      expect(drops).toHaveLength(2);
      expect(drops.map((drop) => drop.userId).sort()).toEqual(
        [first.id, second.id].sort(),
      );
      expect(drops.every((drop) => drop.deckName === "skyjo")).toBe(true);
      expect(drops.every((drop) => drop.cardCount === 5)).toBe(true);
    }, "skyjo-card-reward");
  });

  it("uses the standard deck for games without a custom mapping", async () => {
    await withTestDatabase(async () => {
      const { seedCardCatalog } = await import("@/lib/card-catalog-seed");
      await seedCardCatalog();
      const first = await createUserFixture();
      const second = await createUserFixture();
      const game = await createGameFixture({
        normalizedTitle: "azul",
        playerUserIds: [first.id, second.id],
      });
      const { grantCardPacksForCompletedGame } = await import(
        "@/lib/card-rewards"
      );
      const { getCardDropsByGameId } = await import(
        "@/lib/db/store/card-drops.store"
      );

      await grantCardPacksForCompletedGame(game);
      const drops = await getCardDropsByGameId(game.id);

      expect(drops).toHaveLength(2);
      expect(drops.every((drop) => drop.deckName === "standard")).toBe(true);
    }, "standard-card-reward");
  });

  it("opens an owned pack once and creates five cards from its deck", async () => {
    await withTestDatabase(async () => {
      const { seedCardCatalog } = await import("@/lib/card-catalog-seed");
      await seedCardCatalog();
      const first = await createUserFixture();
      const second = await createUserFixture();
      const game = await createGameFixture({
        normalizedTitle: "azul",
        playerUserIds: [first.id, second.id],
      });
      const { grantCardPacksForCompletedGame, openCardDropForUser } =
        await import("@/lib/card-rewards");
      const { cardDrops, cards, db } = await import("@/lib/db");

      await grantCardPacksForCompletedGame(game);
      const drop = await db.query.cardDrops.findFirst({
        where: eq(cardDrops.userId, first.id),
      });
      if (!drop) throw new Error("Missing card drop fixture");

      const openedCards = await openCardDropForUser({
        cardDropId: drop.id,
        userId: first.id,
      });
      const persistedCards = await db.query.cards.findMany({
        where: eq(cards.ownerId, first.id),
      });
      const openedDrop = await db.query.cardDrops.findFirst({
        where: eq(cardDrops.id, drop.id),
      });

      expect(openedCards).toHaveLength(5);
      expect(persistedCards).toHaveLength(5);
      expect(persistedCards.every((card) => card.deckName === "standard")).toBe(
        true,
      );
      expect(openedCards.every((card) => card.deckLabel === "Score Loser")).toBe(true);
      expect(openedDrop?.openedAt).toBeTruthy();
      await expect(
        openCardDropForUser({ cardDropId: drop.id, userId: first.id }),
      ).rejects.toThrow("already been opened");
    }, "open-card-reward");
  });
});
