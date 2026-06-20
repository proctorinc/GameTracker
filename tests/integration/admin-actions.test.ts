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
});
