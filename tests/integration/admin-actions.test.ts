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

function mockRevalidateTag() {
  vi.doMock("next/cache", () => ({
    revalidateTag: vi.fn(),
  }));
}

describe("admin actions", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("creates a direct friendship for two active users", async () => {
    await withTestDatabase(async () => {
      const admin = await createUserFixture({ role: "admin" });
      const userA = await createUserFixture({ firstName: "Alex" });
      const userB = await createUserFixture({ firstName: "Bailey" });
      mockProtectedSessionUser(admin.id);
      mockRevalidateTag();

      const { createAdminFriendship } = await import("../../src/app/actions/admin");
      const { getFriendshipByUsers } = await import(
        "../../src/lib/db/store/friendship.store"
      );

      const result = await createAdminFriendship({
        userAId: userA.id,
        userBId: userB.id,
      });

      expect(result.status).toBe("created");
      expect(await getFriendshipByUsers(userA.id, userB.id)).toBeTruthy();
    }, "admin-direct-friendship");
  });

  it("returns already_friends for an existing pair", async () => {
    await withTestDatabase(async () => {
      const admin = await createUserFixture({ role: "admin" });
      const userA = await createUserFixture();
      const userB = await createUserFixture();
      mockProtectedSessionUser(admin.id);
      mockRevalidateTag();

      const { createFriendship, getFriendshipByUsers } = await import(
        "../../src/lib/db/store/friendship.store"
      );
      const { createAdminFriendship } = await import("../../src/app/actions/admin");

      await createFriendship({
        user1Id: userA.id,
        user2Id: userB.id,
        inviterId: admin.id,
      });

      const result = await createAdminFriendship({
        userAId: userA.id,
        userBId: userB.id,
      });

      expect(result.status).toBe("already_friends");
      expect(await getFriendshipByUsers(userA.id, userB.id)).toBeTruthy();
    }, "admin-direct-friendship-existing");
  });

  it("merges a guest into a target account", async () => {
    await withTestDatabase(async () => {
      const admin = await createUserFixture({ role: "admin" });
      const target = await createUserFixture();
      const guest = await createUserFixture({
        isGuest: true,
        created_by_user_id: admin.id,
      });
      mockProtectedSessionUser(admin.id);
      mockRevalidateTag();

      const { db, gamePlayers, games } = await import("../../src/lib/db");
      const { mergeUsersAsAdmin } = await import("../../src/app/actions/admin");
      const { getUserById } = await import("../../src/lib/db/store/user.store");

      const [game] = await db
        .insert(games)
        .values({
          creatorId: guest.id,
          scoringMode: "highest_wins",
          endingMode: "none",
        })
        .returning();

      await db.insert(gamePlayers).values({
        gameId: game!.id,
        userId: guest.id,
        score: 18,
      });

      const result = await mergeUsersAsAdmin({
        sourceUserId: guest.id,
        targetUserId: target.id,
      });

      expect(result).toEqual({
        mergedGamePlayerCount: 1,
        deletedDuplicateGamePlayerCount: 0,
      });
      expect(await getUserById(guest.id)).toBeNull();
    }, "admin-merge-guest");
  });

  it("merges a registered user into another registered user while keeping target profile fields", async () => {
    await withTestDatabase(async () => {
      const rankedAt = "2026-06-10T12:00:00.000Z";
      const admin = await createUserFixture({ role: "admin", createdAt: rankedAt });
      const target = await createUserFixture({
        clerkUserId: "clerk-target",
        email: "target@example.com",
        firstName: "Target",
        lastName: "Account",
        createdAt: rankedAt,
      });
      const source = await createUserFixture({
        clerkUserId: "clerk-source",
        email: "source@example.com",
        firstName: "Source",
        lastName: "Account",
        createdAt: rankedAt,
      });
      mockProtectedSessionUser(admin.id);
      mockRevalidateTag();

      const { db, gamePlayers, games, gamePlayerRankResults, playerRankConfigs } =
        await import("../../src/lib/db");
      const { mergeUsersAsAdmin } = await import("../../src/app/actions/admin");
      const {
        getUserById,
      } = await import("../../src/lib/db/store/user.store");
      const {
        getUserPlayerRankSummary,
        rebuildPlayerRankHistoryFromDate,
      } = await import("../../src/lib/db/store/player-rank.store");

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
          }),
          smallGameDistributionJson: JSON.stringify({
            2: [10000, 0, 0],
            3: [10000, 0, 0],
          }),
          largeGameDistributionJson: JSON.stringify([6000, 3000, 1000]),
          createdByUserId: admin.id,
          createdAt: rankedAt,
        })
        .returning();

      if (!config) {
        throw new Error("Missing player rank config");
      }

      const [game] = await db
        .insert(games)
        .values({
          creatorId: source.id,
          scoringMode: "highest_wins",
          endingMode: "none",
          completedAt: rankedAt,
        })
        .returning();

      await db.insert(gamePlayers).values({
        gameId: game!.id,
        userId: source.id,
        score: 18,
      });

      await db.insert(gamePlayerRankResults).values({
        gameId: game!.id,
        userId: source.id,
        gameCompletedAt: rankedAt,
        playerCount: 2,
        placement: 1,
        tieSize: 1,
        rankConfigId: config.id,
        prizePoolMinor: 5000,
        payoutPercentBps: 10000,
        pointsAwardedMinor: 5000,
        createdAt: rankedAt,
      });

      await rebuildPlayerRankHistoryFromDate({
        startDate: rankedAt,
        now: new Date(rankedAt),
      });

      const result = await mergeUsersAsAdmin({
        sourceUserId: source.id,
        targetUserId: target.id,
      });

      const [mergedSource, refreshedTarget, summary, playerRows] = await Promise.all([
        getUserById(source.id),
        getUserById(target.id),
        getUserPlayerRankSummary(target.id),
        db.query.gamePlayers.findMany(),
      ]);

      expect(result).toEqual({
        mergedGamePlayerCount: 1,
        deletedDuplicateGamePlayerCount: 0,
      });
      expect(mergedSource).toBeNull();
      expect(refreshedTarget?.clerkUserId).toBe("clerk-target");
      expect(refreshedTarget?.email).toBe("target@example.com");
      expect(refreshedTarget?.firstName).toBe("Target");
      expect(refreshedTarget?.lastName).toBe("Account");
      expect(summary?.playerRankTotalMinor).toBe(5000);
      expect(playerRows).toHaveLength(1);
      expect(playerRows[0]?.userId).toBe(target.id);
    }, "admin-merge-registered");
  });
});
