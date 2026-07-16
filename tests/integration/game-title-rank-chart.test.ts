import { describe, expect, it } from "vitest";
import { createUserFixture } from "../fixtures/users";
import { withTestDatabase } from "../helpers/test-db";

describe("game title rank chart", () => {
  it("includes eligible friends' title games without exposing non-friends or opted-out friends", async () => {
    await withTestDatabase(async () => {
      const viewer = await createUserFixture({ firstName: "Viewer" });
      const friend = await createUserFixture({ firstName: "Friend" });
      const hiddenFriend = await createUserFixture({
        firstName: "Hidden",
        playerRankLeaderboardDisabled: true,
      });
      const nonFriend = await createUserFixture({ firstName: "Stranger" });
      const {
        db,
        gamePlayerRankResults,
        games,
        gameTitle,
        playerRankConfigs,
      } = await import("../../src/lib/db");
      const { createFriendship } = await import(
        "../../src/lib/db/store/friendship.store"
      );
      const { getGameTitleStatsPageData } = await import(
        "../../src/lib/db/store/game.store"
      );

      await Promise.all([
        createFriendship({
          user1Id: viewer.id,
          user2Id: friend.id,
          inviterId: viewer.id,
        }),
        createFriendship({
          user1Id: viewer.id,
          user2Id: hiddenFriend.id,
          inviterId: viewer.id,
        }),
      ]);

      const [title, otherTitle] = await db
        .insert(gameTitle)
        .values([
          {
            title: "Chart Title",
            normalizedTitle: "chart title",
            color: "#123456",
            isUniversal: true,
            createdByUserId: viewer.id,
          },
          {
            title: "Other Title",
            normalizedTitle: "other title",
            color: "#654321",
            isUniversal: true,
            createdByUserId: viewer.id,
          },
        ])
        .returning();
      const [config] = await db
        .insert(playerRankConfigs)
        .values({
          version: "title-chart-v1",
          isActive: true,
          windowMonths: 6,
          defaultMaxPrizePool: 40000,
          prizePoolByPlayerCountJson: JSON.stringify({ 2: 5000 }),
          smallGameDistributionJson: JSON.stringify({ 2: [10000, 0, 0] }),
          largeGameDistributionJson: JSON.stringify([6000, 3000, 1000]),
          createdByUserId: viewer.id,
        })
        .returning();

      if (!title || !otherTitle || !config) {
        throw new Error("Missing title chart fixtures");
      }

      const completedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      await db.insert(games).values([
        {
          id: "friend-title-game",
          creatorId: friend.id,
          gameTitleId: title.id,
          scoringMode: "highest_wins",
          completedAt,
        },
        {
          id: "hidden-title-game",
          creatorId: hiddenFriend.id,
          gameTitleId: title.id,
          scoringMode: "highest_wins",
          completedAt,
        },
        {
          id: "stranger-title-game",
          creatorId: nonFriend.id,
          gameTitleId: title.id,
          scoringMode: "highest_wins",
          completedAt,
        },
        {
          id: "friend-other-game",
          creatorId: friend.id,
          gameTitleId: otherTitle.id,
          scoringMode: "highest_wins",
          completedAt,
        },
      ]);

      const resultBase = {
        gameCompletedAt: completedAt,
        playerCount: 2,
        placement: 1,
        tieSize: 1,
        rankConfigId: config.id,
        prizePoolMinor: 5000,
        payoutPercentBps: 10000,
      };
      await db.insert(gamePlayerRankResults).values([
        {
          ...resultBase,
          gameId: "friend-title-game",
          userId: friend.id,
          pointsAwardedMinor: 2500,
        },
        {
          ...resultBase,
          gameId: "hidden-title-game",
          userId: hiddenFriend.id,
          pointsAwardedMinor: 3500,
        },
        {
          ...resultBase,
          gameId: "stranger-title-game",
          userId: nonFriend.id,
          pointsAwardedMinor: 4500,
        },
        {
          ...resultBase,
          gameId: "friend-other-game",
          userId: friend.id,
          pointsAwardedMinor: 5500,
        },
      ]);

      const data = await getGameTitleStatsPageData({
        userId: viewer.id,
        gameTitleId: title.id,
      });

      expect(data?.chartSeries.map((series) => series.userId)).toEqual([
        friend.id,
        viewer.id,
      ]);
      expect(data?.defaultChartSelectedUserIds).toEqual([friend.id]);
      expect(data?.chartSeries[0]).toMatchObject({
        userId: friend.id,
        currentTitleRankTotalMinor: 2500,
        hasHistory: true,
      });
      expect(data?.chartSeries[1]).toMatchObject({
        userId: viewer.id,
        currentTitleRankTotalMinor: 0,
        hasHistory: false,
      });
      expect(data?.chartSeries.every((series) => series.points.length === 90)).toBe(
        true,
      );
    }, "game-title-rank-chart-friends");
  });
});
