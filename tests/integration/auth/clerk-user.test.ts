import type { User as ClerkBackendUser } from "@clerk/backend";
import { describe, expect, it, vi } from "vitest";
import { createUserFixture } from "../../fixtures/users";
import { withTestDatabase } from "../../helpers/test-db";

vi.mock("server-only", () => ({}));

function createClerkUser(input: {
  id: string;
  email: string;
  imageUrl: string;
}) {
  return {
    id: input.id,
    firstName: "Ada",
    lastName: "Lovelace",
    imageUrl: input.imageUrl,
    primaryEmailAddressId: "email_1",
    emailAddresses: [
      {
        id: "email_1",
        emailAddress: input.email,
      },
    ],
  } as unknown as ClerkBackendUser;
}

describe("Clerk user synchronization", () => {
  it("preserves the selected profile background during updates and disconnects", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture({
        email: "ada@example.com",
        avatarUrl: "/images/profiles/rocks.png",
      });
      const { clearLocalUserClerkIdentity, upsertLocalUserFromClerkUser } =
        await import("../../../src/lib/auth/clerk-user");

      const synced = await upsertLocalUserFromClerkUser(
        createClerkUser({
          id: "clerk_ada",
          email: "ada@example.com",
          imageUrl: "https://img.clerk.com/clerk-avatar.png",
        }),
      );

      expect(synced.id).toBe(user.id);
      expect(synced.avatarUrl).toBe("/images/profiles/rocks.png");

      const disconnected = await clearLocalUserClerkIdentity("clerk_ada");

      expect(disconnected?.avatarUrl).toBe("/images/profiles/rocks.png");
    }, "clerk-user-profile-background");
  });

  it("does not seed new users with Clerk's avatar image", async () => {
    await withTestDatabase(async () => {
      const { upsertLocalUserFromClerkUser } = await import(
        "../../../src/lib/auth/clerk-user"
      );

      const created = await upsertLocalUserFromClerkUser(
        createClerkUser({
          id: "clerk_new_user",
          email: "new-user@example.com",
          imageUrl: "https://img.clerk.com/clerk-avatar.png",
        }),
      );

      expect(created.avatarUrl).toBeNull();
    }, "clerk-user-no-clerk-avatar");
  });
});
