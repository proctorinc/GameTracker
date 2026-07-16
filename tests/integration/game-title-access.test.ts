import { describe, expect, it } from "vitest";
import { createUserFixture } from "../fixtures/users";
import { withTestDatabase } from "../helpers/test-db";

describe("game title access", () => {
  it("separates shared and independent title histories for comparisons", async () => {
    await withTestDatabase(async () => {
      const viewer = await createUserFixture({ firstName: "Viewer" });
      const rival = await createUserFixture({ firstName: "Rival" });
      const thirdPlayer = await createUserFixture({ firstName: "Third" });
      const { db, gamePlayers, gameTitle, gameWinners, games } = await import(
        "../../src/lib/db"
      );
      const { getGameTitleStatsPageData } = await import(
        "../../src/lib/db/store/game.store"
      );
      const [title] = await db
        .insert(gameTitle)
        .values({
          title: "Comparison Title",
          normalizedTitle: "comparison title",
          color: "#123456",
          isUniversal: true,
          createdByUserId: viewer.id,
        })
        .returning();

      const completedAt = "2026-07-01T12:00:00.000Z";
      await db.insert(games).values([
        {
          id: "shared-game",
          gameTitleId: title!.id,
          creatorId: viewer.id,
          completedAt,
        },
        {
          id: "viewer-only-game",
          gameTitleId: title!.id,
          creatorId: viewer.id,
        },
        {
          id: "rival-only-completed",
          gameTitleId: title!.id,
          creatorId: rival.id,
          completedAt,
        },
        {
          id: "rival-only-active",
          gameTitleId: title!.id,
          creatorId: rival.id,
        },
      ]);
      await db.insert(gamePlayers).values([
        { gameId: "shared-game", userId: viewer.id, score: 10 },
        { gameId: "shared-game", userId: rival.id, score: 20 },
        { gameId: "shared-game", userId: thirdPlayer.id, score: 30 },
        { gameId: "viewer-only-game", userId: viewer.id, score: 5 },
        { gameId: "rival-only-completed", userId: rival.id, score: 8 },
        { gameId: "rival-only-active", userId: rival.id, score: 9 },
      ]);
      await db.insert(gameWinners).values([
        { gameId: "shared-game", userId: viewer.id },
        { gameId: "rival-only-completed", userId: rival.id },
      ]);

      const data = await getGameTitleStatsPageData({
        userId: viewer.id,
        gameTitleId: title!.id,
      });
      const comparison = data?.comparisonSummariesByUserId[rival.id];

      expect(comparison?.headToHeadStats.current).toMatchObject({
        totalGames: 1,
        completedGames: 1,
        activeGames: 0,
        wins: 1,
      });
      expect(comparison?.headToHeadStats.comparison).toMatchObject({
        totalGames: 1,
        completedGames: 1,
        activeGames: 0,
        wins: 0,
      });
      expect(comparison?.allTimeStats).toMatchObject({
        totalGames: 3,
        completedGames: 2,
        activeGames: 1,
        wins: 1,
      });
    }, "game-title-comparison-modes");
  });

  it("lets admins load a custom title page for a title they do not own", async () => {
    await withTestDatabase(async () => {
      const admin = await createUserFixture({ role: "admin" });
      const owner = await createUserFixture();

      const { db, gameTitle } = await import("../../src/lib/db");
      const { getGameTitleStatsPageData } = await import(
        "../../src/lib/db/store/game.store"
      );

      const [title] = await db
        .insert(gameTitle)
        .values({
          title: "Owner Custom Title",
          normalizedTitle: "owner custom title",
          color: "#123456",
          isUniversal: false,
          createdByUserId: owner.id,
        })
        .returning();

      expect(title).toBeTruthy();

      const data = await getGameTitleStatsPageData({
        userId: admin.id,
        gameTitleId: title!.id,
        allowAdminAccess: true,
      });

      expect(data).not.toBeNull();
      expect(data?.title.id).toBe(title!.id);
      expect(data?.title.createdByUserId).toBe(owner.id);
    }, "game-title-access-admin-custom-title");
  });

  it("keeps non-owner non-admins blocked from custom title pages", async () => {
    await withTestDatabase(async () => {
      const owner = await createUserFixture();
      const viewer = await createUserFixture();

      const { db, gameTitle } = await import("../../src/lib/db");
      const { getGameTitleStatsPageData } = await import(
        "../../src/lib/db/store/game.store"
      );

      const [title] = await db
        .insert(gameTitle)
        .values({
          title: "Private Custom Title",
          normalizedTitle: "private custom title",
          color: "#654321",
          isUniversal: false,
          createdByUserId: owner.id,
        })
        .returning();

      expect(title).toBeTruthy();

      const data = await getGameTitleStatsPageData({
        userId: viewer.id,
        gameTitleId: title!.id,
      });

      expect(data).toBeNull();
    }, "game-title-access-non-admin-custom-title");
  });
});
