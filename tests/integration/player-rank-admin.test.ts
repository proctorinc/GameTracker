import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createUserFixture } from "../fixtures/users";
import { withTestDatabase } from "../helpers/test-db";

function mockProtectedSessionUser(userId: string) {
  vi.doMock("@/lib/auth/protected-session", () => ({
    loadUser: async () => {
      const { getUserById } = await import("@/lib/db/store/user.store");
      const user = await getUserById(userId);

      if (!user) {
        throw new Error(`Missing test user ${userId}`);
      }

      return { user };
    },
  }));
}

describe("player rank leaderboard admin", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("keeps disabled users scored but removes them from dense global rank positions", async () => {
    await withTestDatabase(async () => {
      const enabledUser = await createUserFixture({
        firstName: "Enabled",
      });
      const disabledUser = await createUserFixture({
        firstName: "Disabled",
        playerRankLeaderboardDisabled: true,
      });
      const lowerUser = await createUserFixture({
        firstName: "Lower",
      });
      const guestUser = await createUserFixture({
        firstName: "Guest",
        isGuest: true,
      });
      const mergedIntoUser = await createUserFixture({
        firstName: "Merged Into",
      });
      const mergedUser = await createUserFixture({
        firstName: "Merged",
        mergedIntoUserId: mergedIntoUser.id,
      });

      const { db, games, gamePlayerRankResults, playerRankConfigs } = await import(
        "../../src/lib/db"
      );
      const completedAt = new Date().toISOString();
      const [config] = await db
        .insert(playerRankConfigs)
        .values({
          version: "v1",
          isActive: true,
          windowMonths: 6,
          defaultMaxPrizePool: 40000,
          prizePoolByPlayerCountJson: JSON.stringify({
            2: 5000,
            3: 10000,
            4: 20000,
            5: 30000,
          }),
          smallGameDistributionJson: JSON.stringify({
            2: [10000, 0, 0],
            3: [10000, 0, 0],
          }),
          largeGameDistributionJson: JSON.stringify([6000, 3000, 1000]),
          createdByUserId: enabledUser.id,
          createdAt: completedAt,
        })
        .returning();

      if (!config) {
        throw new Error("Missing config");
      }

      await db.insert(games).values([
        {
          id: "game-a",
          creatorId: enabledUser.id,
          scoringMode: "highest_wins",
          completedAt,
        },
        {
          id: "game-b",
          creatorId: enabledUser.id,
          scoringMode: "highest_wins",
          completedAt,
        },
        {
          id: "game-c",
          creatorId: enabledUser.id,
          scoringMode: "highest_wins",
          completedAt,
        },
      ]);

      await db.insert(gamePlayerRankResults).values([
        {
          gameId: "game-a",
          userId: disabledUser.id,
          gameCompletedAt: completedAt,
          playerCount: 4,
          placement: 1,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 20000,
          payoutPercentBps: 6000,
          pointsAwardedMinor: 30000,
          createdAt: completedAt,
        },
        {
          gameId: "game-b",
          userId: enabledUser.id,
          gameCompletedAt: completedAt,
          playerCount: 4,
          placement: 1,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 20000,
          payoutPercentBps: 6000,
          pointsAwardedMinor: 20000,
          createdAt: completedAt,
        },
        {
          gameId: "game-c",
          userId: lowerUser.id,
          gameCompletedAt: completedAt,
          playerCount: 4,
          placement: 2,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 20000,
          payoutPercentBps: 3000,
          pointsAwardedMinor: 10000,
          createdAt: completedAt,
        },
      ]);

      const { getUserPlayerRankSummary, listPlayerRankStandings } = await import(
        "../../src/lib/db/store/player-rank.store"
      );

      const standings = await listPlayerRankStandings();

      expect(standings.map((row) => row.displayName)).toEqual([
        "Enabled User",
        "Lower User",
        "Merged Into User",
        "Disabled User",
      ]);
      expect(standings.map((row) => row.playerRankPosition)).toEqual([1, 2, 3, null]);
      expect(standings.map((row) => row.isLeaderboardDisabled)).toEqual([
        false,
        false,
        false,
        true,
      ]);
      expect(standings.some((row) => row.userId === guestUser.id)).toBe(false);
      expect(standings.some((row) => row.userId === mergedUser.id)).toBe(false);

      const disabledSummary = await getUserPlayerRankSummary(disabledUser.id);
      expect(disabledSummary?.playerRankTotal).toBe("300");
      expect(disabledSummary?.playerRankPosition).toBeNull();
      expect(disabledSummary?.isLeaderboardDisabled).toBe(true);
    }, "player-rank-disabled-standings");
  });

  it("lets admins toggle leaderboard exclusion and rejects non-admins", async () => {
    await withTestDatabase(async () => {
      const admin = await createUserFixture({
        role: "admin",
      });
      const target = await createUserFixture({
        firstName: "Target",
      });
      mockProtectedSessionUser(admin.id);

      const revalidateTag = vi.fn();
      vi.doMock("next/cache", () => ({
        revalidateTag,
      }));

      const { setPlayerRankLeaderboardDisabled } = await import(
        "../../src/app/actions/player-rank"
      );
      const { getUserById } = await import("../../src/lib/db/store/user.store");
      const {
        getPlayerRankStandingsTag,
        getPlayerRankTag,
        getProfileOverviewTag,
        getPublicProfileTag,
      } = await import("../../src/lib/cache-tags");

      await setPlayerRankLeaderboardDisabled({
        userId: target.id,
        disabled: true,
      });

      expect((await getUserById(target.id))?.playerRankLeaderboardDisabled).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith(getPlayerRankStandingsTag(), "max");
      expect(revalidateTag).toHaveBeenCalledWith(getPlayerRankTag(target.id), "max");
      expect(revalidateTag).toHaveBeenCalledWith(getProfileOverviewTag(target.id), "max");
      expect(revalidateTag).toHaveBeenCalledWith(getPublicProfileTag(target.id), "max");

      vi.resetModules();
      const nonAdmin = await createUserFixture();
      mockProtectedSessionUser(nonAdmin.id);
      vi.doMock("next/cache", () => ({
        revalidateTag: vi.fn(),
      }));

      const { setPlayerRankLeaderboardDisabled: setAsNonAdmin } = await import(
        "../../src/app/actions/player-rank"
      );

      await expect(
        setAsNonAdmin({
          userId: target.id,
          disabled: false,
        }),
      ).rejects.toThrow("Admin access required");
    }, "player-rank-admin-toggle");
  });

  it("flags malformed player rank coverage and clears it after targeted remediation", async () => {
    await withTestDatabase(async () => {
      const admin = await createUserFixture({
        role: "admin",
        firstName: "Admin",
      });
      const playerOne = await createUserFixture({ firstName: "One" });
      const playerTwo = await createUserFixture({ firstName: "Two" });
      const playerThree = await createUserFixture({ firstName: "Three" });
      mockProtectedSessionUser(admin.id);

      const revalidateTag = vi.fn();
      vi.doMock("next/cache", () => ({
        revalidateTag,
      }));

      const { db, gamePlayerRankResults, gamePlayers, games, playerRankConfigs } =
        await import("../../src/lib/db");
      const completedAt = new Date().toISOString();
      const [config] = await db
        .insert(playerRankConfigs)
        .values({
          version: "v1",
          isActive: true,
          windowMonths: 6,
          defaultMaxPrizePool: 40000,
          prizePoolByPlayerCountJson: JSON.stringify({
            2: 5000,
            3: 10000,
            4: 20000,
            5: 30000,
          }),
          smallGameDistributionJson: JSON.stringify({
            2: [10000, 0, 0],
            3: [10000, 0, 0],
          }),
          largeGameDistributionJson: JSON.stringify([6000, 3000, 1000]),
          createdByUserId: admin.id,
          createdAt: completedAt,
        })
        .returning();

      if (!config) {
        throw new Error("Missing config");
      }

      await db.insert(games).values([
        {
          id: "healthy-two-player",
          creatorId: admin.id,
          scoringMode: "highest_wins",
          completedAt,
        },
        {
          id: "bad-two-player",
          creatorId: admin.id,
          scoringMode: "highest_wins",
          completedAt,
        },
        {
          id: "bad-three-player",
          creatorId: admin.id,
          scoringMode: "highest_wins",
          completedAt,
        },
        {
          id: "incomplete-game",
          creatorId: admin.id,
          scoringMode: "highest_wins",
          completedAt: null,
        },
      ]);

      await db.insert(gamePlayers).values([
        {
          gameId: "healthy-two-player",
          userId: playerOne.id,
          score: 20,
        },
        {
          gameId: "healthy-two-player",
          userId: playerTwo.id,
          score: 10,
        },
        {
          gameId: "bad-two-player",
          userId: playerOne.id,
          score: 22,
        },
        {
          gameId: "bad-two-player",
          userId: playerTwo.id,
          score: 11,
        },
        {
          gameId: "bad-three-player",
          userId: playerOne.id,
          score: 30,
        },
        {
          gameId: "bad-three-player",
          userId: playerTwo.id,
          score: 20,
        },
        {
          gameId: "bad-three-player",
          userId: playerThree.id,
          score: 10,
        },
        {
          gameId: "incomplete-game",
          userId: playerOne.id,
          score: 5,
        },
        {
          gameId: "incomplete-game",
          userId: playerTwo.id,
          score: 4,
        },
      ]);

      await db.insert(gamePlayerRankResults).values([
        {
          gameId: "healthy-two-player",
          userId: playerOne.id,
          gameCompletedAt: completedAt,
          playerCount: 2,
          placement: 1,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 5000,
          payoutPercentBps: 10000,
          pointsAwardedMinor: 5000,
          createdAt: completedAt,
        },
        {
          gameId: "healthy-two-player",
          userId: playerTwo.id,
          gameCompletedAt: completedAt,
          playerCount: 2,
          placement: 2,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 5000,
          payoutPercentBps: 0,
          pointsAwardedMinor: 0,
          createdAt: completedAt,
        },
        {
          gameId: "bad-two-player",
          userId: playerOne.id,
          gameCompletedAt: completedAt,
          playerCount: 2,
          placement: 1,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 5000,
          payoutPercentBps: 10000,
          pointsAwardedMinor: 5000,
          createdAt: completedAt,
        },
        {
          gameId: "bad-three-player",
          userId: playerOne.id,
          gameCompletedAt: completedAt,
          playerCount: 3,
          placement: 1,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 10000,
          payoutPercentBps: 10000,
          pointsAwardedMinor: 10000,
          createdAt: completedAt,
        },
        {
          gameId: "bad-three-player",
          userId: playerTwo.id,
          gameCompletedAt: completedAt,
          playerCount: 3,
          placement: 2,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 10000,
          payoutPercentBps: 0,
          pointsAwardedMinor: 0,
          createdAt: completedAt,
        },
      ]);

      const { getPlayerRankHealthCheck } = await import(
        "../../src/lib/db/store/player-rank.store"
      );
      const { recalculatePlayerRankHealthIssues } = await import(
        "../../src/app/actions/player-rank"
      );

      const before = await getPlayerRankHealthCheck();
      expect(before.status).toBe("review");
      expect(before.totalCheckedGameCount).toBe(3);
      expect(before.affectedGameIds.sort()).toEqual([
        "bad-three-player",
        "bad-two-player",
      ]);

      const remediation = await recalculatePlayerRankHealthIssues();
      expect(remediation.processedGameCount).toBe(2);
      expect(remediation.changed).toBe(true);
      expect(remediation.healthCheck.status).toBe("good");

      const after = await getPlayerRankHealthCheck();
      expect(after.status).toBe("good");

      const remediatedRows = await db.query.gamePlayerRankResults.findMany({
        where: eq(gamePlayerRankResults.gameId, "bad-three-player"),
      });
      expect(new Set(remediatedRows.map((row) => row.userId)).size).toBe(3);

      vi.resetModules();
      const nonAdmin = await createUserFixture();
      mockProtectedSessionUser(nonAdmin.id);
      vi.doMock("next/cache", () => ({
        revalidateTag: vi.fn(),
      }));
      const { recalculatePlayerRankHealthIssues: recalcAsNonAdmin } = await import(
        "../../src/app/actions/player-rank"
      );

      await expect(recalcAsNonAdmin()).rejects.toThrow("Admin access required");
    }, "player-rank-health-check");
  });
});
