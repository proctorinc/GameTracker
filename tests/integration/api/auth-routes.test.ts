import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createUserFixture } from "../../fixtures/users";
import { withTestDatabase } from "../../helpers/test-db";

function mockAuthenticatedRouteUser(userId: string) {
  vi.doMock("@/lib/server-request-context", () => ({
    getServerRequestContext: async () => ({}),
    getRequestContextFromRequest: () => ({}),
  }));
  vi.doMock("@clerk/nextjs/server", () => ({
    auth: async () => ({
      userId: "clerk_test_user",
      sessionId: "sess_test",
    }),
    currentUser: async () => ({
      id: "clerk_test_user",
      imageUrl: "https://example.com/avatar.png",
      firstName: "Ada",
      lastName: "Lovelace",
      primaryEmailAddressId: "email_1",
      emailAddresses: [
        {
          id: "email_1",
          emailAddress: "ada@example.com",
        },
      ],
      primaryPhoneNumberId: null,
      phoneNumbers: [],
    }),
    clerkClient: async () => ({
      users: {
        getUser: async () => ({
          id: "clerk_test_user",
          imageUrl: "https://example.com/avatar.png",
          firstName: "Ada",
          lastName: "Lovelace",
          primaryEmailAddressId: "email_1",
          emailAddresses: [
            {
              id: "email_1",
              emailAddress: "ada@example.com",
            },
          ],
          primaryPhoneNumberId: null,
          phoneNumbers: [],
        }),
      },
    }),
  }));

  vi.doMock("@/lib/auth/clerk-user", () => ({
    upsertLocalUserFromClerkUser: async () => {
      const { getUserById, updateUser } = await import(
        "../../../src/lib/db/store/user.store"
      );
      const existing = await getUserById(userId);

      if (!existing) {
        throw new Error(`Missing test user ${userId}`);
      }

      return (
        (await updateUser(userId, {
          clerkUserId: "clerk_test_user",
          email: "ada@example.com",
          avatarUrl: "https://example.com/avatar.png",
        })) ?? existing
      );
    },
  }));
}

describe("auth route integration", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("returns current auth data and dashboard groups for a valid Clerk session", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture({
        firstName: "Ada",
        email: "ada@example.com",
      });
      const friend = await createUserFixture({
        firstName: "Blair",
      });
      const { createFriendship } = await import(
        "../../../src/lib/db/store/friendship.store"
      );
      await createFriendship({
        user1Id: user.id,
        user2Id: friend.id,
        inviterId: user.id,
      });

      mockAuthenticatedRouteUser(user.id);

      const { GET: authMe } = await import(
        "../../../src/app/api/auth/me/route"
      );
      const meResponse = await authMe(
        new Request("http://localhost:3000/api/auth/me") as unknown as NextRequest,
      );
      expect(meResponse.status).toBe(200);
      const meJson = await meResponse.json();
      expect(meJson.id).toBe(user.id);
      expect(meJson.network).toHaveLength(1);

      const { GET: dashboardGroups } = await import(
        "../../../src/app/api/dashboard-groups/route"
      );
      const groupsResponse = await dashboardGroups(
        new Request("http://localhost:3000/api/dashboard-groups"),
      );

      expect(groupsResponse.status).toBe(200);
      await expect(groupsResponse.json()).resolves.toHaveLength(1);
    }, "auth-me-route");
  });

  it("returns a no-op success response for logout", async () => {
    const { POST: logout } = await import("../../../src/app/api/auth/logout/route");
    const response = await logout(
      new Request("http://localhost:3000/api/auth/logout", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(204);
  });
});
