import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createUserFixture } from "../../fixtures/users";
import { withTestDatabase } from "../../helpers/test-db";

function mockAuthenticatedUser(userId: string) {
  vi.doMock("@/lib/auth/auth-me", () => ({
    loadCurrentUser: async () => {
      const { getUserById } = await import("@/lib/db/store/user.store");
      const user = await getUserById(userId);

      if (!user) {
        throw new Error(`Missing test user ${userId}`);
      }

      return user;
    },
  }));
  vi.doMock("@/lib/server-request-context", () => ({
    getServerRequestContext: async () => ({}),
    getRequestContextFromRequest: () => ({}),
  }));
}

describe("guest claim links", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("creates and reuses a pending claim link for an owned guest", async () => {
    await withTestDatabase(async () => {
      const owner = await createUserFixture();
      const guest = await createUserFixture({
        isGuest: true,
        created_by_user_id: owner.id,
        clerkUserId: null,
      });

      mockAuthenticatedUser(owner.id);
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));

      const { createFriendInvitationLink } = await import(
        "../../../src/app/actions/friends"
      );
      const { db, invitations } = await import("../../../src/lib/db/store");

      const formData = new FormData();
      formData.set("guestUserId", guest.id);

      const first = await createFriendInvitationLink(formData);
      const second = await createFriendInvitationLink(formData);
      const persistedInvitations = await db.query.invitations.findMany({
        where: eq(invitations.inviterUserId, owner.id),
      });

      expect(first).toEqual(second);
      expect(first.invitePath).toMatch(/^\/invite\//);
      expect(persistedInvitations).toHaveLength(1);
      expect(persistedInvitations[0]).toMatchObject({
        inviterUserId: owner.id,
        guestUserId: guest.id,
        kind: "claim_guest",
        targetType: "link",
        status: "pending",
      });
    }, "guest-claim-links");
  });

  it("rejects claim link generation for a non-guest user", async () => {
    await withTestDatabase(async () => {
      const owner = await createUserFixture();
      const regularUser = await createUserFixture();

      mockAuthenticatedUser(owner.id);
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));

      const { createFriendInvitationLink } = await import(
        "../../../src/app/actions/friends"
      );

      const formData = new FormData();
      formData.set("guestUserId", regularUser.id);

      await expect(createFriendInvitationLink(formData)).rejects.toThrow(
        "Claim links can only be generated for guests",
      );
    }, "guest-claim-links-non-guest");
  });

  it("rejects claim link generation for another user's guest", async () => {
    await withTestDatabase(async () => {
      const owner = await createUserFixture();
      const otherOwner = await createUserFixture();
      const guest = await createUserFixture({
        isGuest: true,
        created_by_user_id: otherOwner.id,
        clerkUserId: null,
      });

      mockAuthenticatedUser(owner.id);
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));

      const { createFriendInvitationLink } = await import(
        "../../../src/app/actions/friends"
      );

      const formData = new FormData();
      formData.set("guestUserId", guest.id);

      await expect(createFriendInvitationLink(formData)).rejects.toThrow(
        "You can only share claim links for guests you created",
      );
    }, "guest-claim-links-owner-boundary");
  });

  it("rejects claim link generation for an already merged guest", async () => {
    await withTestDatabase(async () => {
      const owner = await createUserFixture();
      const claimant = await createUserFixture();
      const guest = await createUserFixture({
        isGuest: true,
        created_by_user_id: owner.id,
        mergedIntoUserId: claimant.id,
        clerkUserId: null,
      });

      mockAuthenticatedUser(owner.id);
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));

      const { createFriendInvitationLink } = await import(
        "../../../src/app/actions/friends"
      );

      const formData = new FormData();
      formData.set("guestUserId", guest.id);

      await expect(createFriendInvitationLink(formData)).rejects.toThrow(
        "This guest profile has already been claimed",
      );
    }, "guest-claim-links-merged");
  });

  it("revokes sibling claim links after a guest is claimed", async () => {
    await withTestDatabase(async () => {
      const owner = await createUserFixture();
      const claimant = await createUserFixture();
      const guest = await createUserFixture({
        isGuest: true,
        created_by_user_id: owner.id,
        clerkUserId: null,
      });

      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));

      mockAuthenticatedUser(owner.id);
      const { createFriendInvitationLink } = await import(
        "../../../src/app/actions/friends"
      );
      const { createInvitation, getInvitationFullByToken } = await import(
        "../../../src/lib/db/store/invitation.store"
      );

      const formData = new FormData();
      formData.set("guestUserId", guest.id);
      const created = await createFriendInvitationLink(formData);
      const inviteToken = created.invitePath?.replace("/invite/", "");

      const sibling = await createInvitation({
        inviterUserId: owner.id,
        targetType: "link",
        inviteToken: "sibling-claim-token",
        guestUserId: guest.id,
        kind: "claim_guest",
        status: "pending",
      });

      if (!inviteToken) {
        throw new Error("Expected claim invite token");
      }

      mockAuthenticatedUser(claimant.id);
      const { finalizeGuestClaimInvitation } = await import(
        "../../../src/app/actions/friends"
      );
      const { getUserById } = await import("../../../src/lib/db/store/user.store");

      const result = await finalizeGuestClaimInvitation({
        inviteToken,
      });
      const accepted = await getInvitationFullByToken(inviteToken);
      const revokedSibling = await getInvitationFullByToken("sibling-claim-token");
      const mergedGuest = await getUserById(guest.id);

      expect(result).toEqual({
        status: "claimed",
        invitationId: created.invitationId,
      });
      expect(accepted?.status).toBe("accepted");
      expect(accepted?.acceptedByUserId).toBe(claimant.id);
      expect(revokedSibling?.id).toBe(sibling.id);
      expect(revokedSibling?.status).toBe("revoked");
      expect(mergedGuest).toBeNull();
    }, "guest-claim-links-finalize");
  });
});
