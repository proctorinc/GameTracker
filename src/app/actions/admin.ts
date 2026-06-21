"use server";

import {
  revalidateDashboardPage,
  revalidateFriendsPage,
  revalidateGameHistoryPage,
  revalidatePlayerRankHistory,
  revalidatePlayerRankPage,
  revalidatePlayerRankStandings,
  revalidateProfileOverviewPage,
  revalidatePublicProfilePage,
  revalidateTitlesPage,
} from "@/lib/cache-invalidation";
import { loadUser } from "@/lib/auth/protected-session";
import {
  createFriendship,
  getFriendshipByUsers,
  getInvitationById,
  mergeUserIntoUser,
  getUserById,
  listPendingInvitationsForGuest,
  mergeGuestUserIntoUser,
  revokePendingInvitationsForGuest,
  updateInvitation,
} from "@/lib/db/store";

function nowIso() {
  return new Date().toISOString();
}

async function requireAdminUser() {
  const { user } = await loadUser();

  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

function revalidateUserViews(userId: string) {
  revalidateDashboardPage(userId);
  revalidateFriendsPage(userId);
  revalidateGameHistoryPage(userId);
  revalidatePlayerRankPage(userId);
  revalidateProfileOverviewPage(userId);
  revalidatePublicProfilePage(userId);
  revalidateTitlesPage(userId);
}

export async function createAdminFriendship(input: {
  userAId: string;
  userBId: string;
}) {
  const admin = await requireAdminUser();
  const userAId = input.userAId.trim();
  const userBId = input.userBId.trim();

  if (!userAId || !userBId) {
    throw new Error("Select two users first");
  }

  if (userAId === userBId) {
    throw new Error("Choose two different users");
  }

  const [userA, userB, existingFriendship] = await Promise.all([
    getUserById(userAId),
    getUserById(userBId),
    getFriendshipByUsers(userAId, userBId),
  ]);

  if (!userA || userA.mergedIntoUserId || userA.isGuest) {
    throw new Error("First user must be an active non-guest account");
  }

  if (!userB || userB.mergedIntoUserId || userB.isGuest) {
    throw new Error("Second user must be an active non-guest account");
  }

  if (existingFriendship) {
    return { status: "already_friends" as const };
  }

  await createFriendship({
    user1Id: userAId,
    user2Id: userBId,
    inviterId: admin.id,
  });

  revalidateUserViews(userAId);
  revalidateUserViews(userBId);

  return { status: "created" as const };
}

export async function revokeAdminInvitation(input: { invitationId: string }) {
  await requireAdminUser();
  const invitationId = input.invitationId.trim();

  if (!invitationId) {
    throw new Error("Invitation id is required");
  }

  const invitation = await getInvitationById(invitationId);

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status !== "pending") {
    throw new Error("Only pending invitations can be revoked");
  }

  const updated = await updateInvitation(invitationId, {
    status: "revoked",
  });

  if (!updated) {
    throw new Error("Unable to revoke invitation");
  }

  revalidateUserViews(invitation.inviterUserId);
  if (invitation.inviteeUserId) {
    revalidateUserViews(invitation.inviteeUserId);
  }

  return updated;
}

export async function mergeUsersAsAdmin(input: {
  sourceUserId: string;
  targetUserId: string;
}) {
  const admin = await requireAdminUser();
  const sourceUserId = input.sourceUserId.trim();
  const targetUserId = input.targetUserId.trim();

  if (!sourceUserId) {
    throw new Error("Select a source user");
  }

  if (!targetUserId) {
    throw new Error("Select a merge target");
  }

  if (sourceUserId === targetUserId) {
    throw new Error("Source and target must be different users");
  }

  const [sourceUser, targetUser, pendingGuestInvitations] = await Promise.all([
    getUserById(sourceUserId),
    getUserById(targetUserId),
    listPendingInvitationsForGuest(sourceUserId),
  ]);

  if (!sourceUser) {
    throw new Error("Source user not found");
  }

  if (sourceUser.mergedIntoUserId) {
    throw new Error("Source user has already been merged");
  }

  if (!targetUser || targetUser.mergedIntoUserId) {
    throw new Error("Target user not found");
  }

  const mergeResult = sourceUser.isGuest
    ? await mergeGuestUserIntoUser({
        guestUserId: sourceUserId,
        recipientUserId: targetUserId,
        inviterUserId: admin.id,
      })
    : await mergeUserIntoUser({
        sourceUserId,
        targetUserId,
        mergeActorUserId: admin.id,
        sourceUserType: "registered",
      });

  if (sourceUser.isGuest) {
    const invitationIdsToRevoke = pendingGuestInvitations.map(
      (invitation) => invitation.id,
    );

    if (invitationIdsToRevoke.length > 0) {
      await Promise.all(
        invitationIdsToRevoke.map((invitationId) =>
          updateInvitation(invitationId, {
            status: "revoked",
            guestUserId: targetUserId,
            acceptedByUserId: null,
            acceptedAt: null,
            updatedAt: nowIso(),
          }),
        ),
      );
    }

    await revokePendingInvitationsForGuest(sourceUserId);
  }

  revalidateUserViews(targetUserId);
  revalidatePlayerRankStandings();
  revalidatePlayerRankHistory();

  return mergeResult;
}
