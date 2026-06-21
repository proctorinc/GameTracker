"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  revalidateDashboardPage,
  revalidateFriendsPage,
  revalidateGameHistoryPage,
  revalidatePublicProfilePage,
  revalidateProfileOverviewPage,
} from "@/lib/cache-invalidation";
import {
  createFriendship,
  createInvitation,
  deleteFriendship,
  findPendingInvitationForUserTarget,
  getFriendshipByUsers,
  getInvitationFullById,
  getInvitationFullByToken,
  getUserByFriendInviteToken,
  getUserById,
  listPendingInvitationsForGuest,
  updateInvitation,
  updateInvitationsByIds,
  mergeGuestUserIntoUser,
  revokePendingInvitationsForGuest,
} from "@/lib/db/store";
import { logError, logInfo, type LogMeta } from "@/lib/server-log";

function nowIso() {
  return new Date().toISOString();
}

function buildInvitePath(inviteToken: string) {
  return `/invite/${inviteToken}`;
}

function createInviteToken() {
  return randomBytes(24).toString("base64url");
}

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function requireCurrentUser() {
  return loadCurrentUser();
}

async function ensureNotAlreadyFriends(userAId: string, userBId: string) {
  const friendship = await getFriendshipByUsers(userAId, userBId);

  if (friendship) {
    throw new Error("You are already friends");
  }

  return friendship;
}

function revalidateFriendsViews(inviteToken?: string | null) {
  revalidateFriendsPage();

  if (inviteToken) {
    revalidatePath(buildInvitePath(inviteToken));
  }
}

function revalidatePublicProfile(userId?: string | null) {
  revalidatePublicProfilePage(userId);
}

function revalidateOwnFriendsData(userId?: string | null) {
  revalidateFriendsPage(userId);
}

function revalidateOwnDashboard(userId?: string | null) {
  revalidateDashboardPage(userId);
}

function revalidateOwnProfileOverview(userId?: string | null) {
  revalidateProfileOverviewPage(userId);
}

function logFriendsActionSuccess(action: string, meta: LogMeta) {
  logInfo(`friends.${action}.succeeded`, meta);
}

function logFriendsActionFailure(
  action: string,
  error: unknown,
  meta: LogMeta,
) {
  logError(`friends.${action}.failed`, error, meta);
}

export async function createFriendInvitationByUserId(input: {
  inviteeUserId: string;
  guestUserId?: string | null;
}): Promise<{ invitationId: string; targetType: "user" }> {
  let actorUserId: string | null = null;
  const inviteeUserId = input.inviteeUserId.trim();
  const guestUserId = input.guestUserId?.trim() || null;

  try {
    const user = await requireCurrentUser();
    actorUserId = user.id;

    if (!inviteeUserId) {
      throw new Error("Invitee user id is required");
    }

    if (inviteeUserId === user.id) {
      throw new Error("You cannot invite yourself");
    }

    const invitee = await getUserById(inviteeUserId);

    if (!invitee) {
      throw new Error("That user does not exist");
    }

    await ensureNotAlreadyFriends(user.id, inviteeUserId);

    const existing = await findPendingInvitationForUserTarget({
      inviterUserId: user.id,
      inviteeUserId,
      guestUserId,
    });

    if (existing) {
      revalidateOwnFriendsData(user.id);
      revalidateOwnFriendsData(inviteeUserId);
      revalidateOwnDashboard(inviteeUserId);
      revalidatePublicProfile(user.id);
      revalidatePublicProfile(inviteeUserId);
      logFriendsActionSuccess("invitation.create", {
        actorUserId: user.id,
        invitationId: existing.id,
        targetType: "user",
        inviteeUserId,
        guestUserId,
        reusedExistingInvitation: true,
      });
      return {
        invitationId: existing.id,
        targetType: "user",
      };
    }

    const invitation = await createInvitation({
      inviterUserId: user.id,
      targetType: "user",
      inviteeUserId,
      guestUserId,
      kind: guestUserId ? "claim_guest" : "friend",
      status: "pending",
    });

    revalidateOwnFriendsData(user.id);
    revalidateOwnFriendsData(inviteeUserId);
    revalidateOwnDashboard(inviteeUserId);
    revalidatePublicProfile(user.id);
    revalidatePublicProfile(inviteeUserId);

    logFriendsActionSuccess("invitation.create", {
      actorUserId: user.id,
      invitationId: invitation.id,
      targetType: "user",
      inviteeUserId,
      guestUserId,
      reusedExistingInvitation: false,
    });

    return {
      invitationId: invitation.id,
      targetType: "user",
    };
  } catch (error) {
    logFriendsActionFailure("invitation.create", error, {
      actorUserId,
      targetType: "user",
      inviteeUserId,
      guestUserId,
    });
    throw error;
  }
}

export async function createFriendInvitationLink(
  formData: FormData,
): Promise<{ invitationId: string; invitePath: string | null }> {
  let actorUserId: string | null = null;
  const guestUserId = getStringValue(formData, "guestUserId") || null;

  try {
    const user = await requireCurrentUser();
    actorUserId = user.id;

    const invitation = await createInvitation({
      inviterUserId: user.id,
      targetType: "link",
      inviteToken: createInviteToken(),
      guestUserId,
      kind: guestUserId ? "claim_guest" : "friend",
      status: "pending",
    });

    revalidateOwnFriendsData(user.id);
    revalidateFriendsViews(invitation.inviteToken);

    logFriendsActionSuccess("invitation_link.create", {
      actorUserId: user.id,
      invitationId: invitation.id,
      guestUserId,
      inviteTokenCreated: Boolean(invitation.inviteToken),
    });

    return {
      invitationId: invitation.id,
      invitePath: invitation.inviteToken
        ? buildInvitePath(invitation.inviteToken)
        : null,
    };
  } catch (error) {
    logFriendsActionFailure("invitation_link.create", error, {
      actorUserId,
      guestUserId,
    });
    throw error;
  }
}

async function resolveInvitationForRecipient(formData: FormData) {
  const invitationId = getStringValue(formData, "invitationId");
  const inviteToken = getStringValue(formData, "inviteToken");

  if (!invitationId && !inviteToken) {
    throw new Error("Invitation id or token is required");
  }

  const invitation = invitationId
    ? await getInvitationFullById(invitationId)
    : await getInvitationFullByToken(inviteToken);

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  return invitation;
}

function canUserActOnInvitation(
  invitation: NonNullable<Awaited<ReturnType<typeof getInvitationFullById>>>,
  user: Awaited<ReturnType<typeof loadCurrentUser>>,
) {
  if (invitation.targetType === "user") {
    return invitation.inviteeUserId === user.id;
  }

  return invitation.inviterUserId !== user.id;
}

type GuestClaimResult =
  | { status: "claimed"; invitationId: string }
  | { status: "already_claimed"; invitationId: string }
  | { status: "invalid"; reason: string; invitationId?: string };

type FriendLinkFinalizeResult =
  | { status: "accepted"; invitationId: string }
  | { status: "already_accepted"; invitationId: string }
  | { status: "invalid"; reason: string; invitationId?: string };

function revalidateInvitationAcceptanceViews(input: {
  inviterUserId: string;
  inviteeUserId: string;
  inviteToken?: string | null;
}) {
  revalidateOwnFriendsData(input.inviterUserId);
  revalidateOwnFriendsData(input.inviteeUserId);
  revalidateOwnDashboard(input.inviteeUserId);
  revalidateOwnProfileOverview(input.inviteeUserId);
  revalidateGameHistoryPage(input.inviterUserId);
  revalidateGameHistoryPage(input.inviteeUserId);
  revalidateFriendsViews(input.inviteToken);
  revalidatePublicProfile(input.inviterUserId);
  revalidatePublicProfile(input.inviteeUserId);
}

async function claimGuestInvitationForUser(
  invitation: NonNullable<Awaited<ReturnType<typeof getInvitationFullById>>>,
  user: Awaited<ReturnType<typeof loadCurrentUser>>,
): Promise<GuestClaimResult> {
  if (invitation.kind !== "claim_guest" || !invitation.guestUserId) {
    return {
      status: "invalid",
      reason: "This invitation does not claim a guest profile.",
      invitationId: invitation.id,
    };
  }

  if (invitation.inviterUserId === user.id) {
    return {
      status: "invalid",
      reason: "You cannot claim your own invitation link.",
      invitationId: invitation.id,
    };
  }

  if (
    invitation.status === "accepted" &&
    invitation.acceptedByUserId === user.id
  ) {
    return {
      status: "already_claimed",
      invitationId: invitation.id,
    };
  }

  if (invitation.status !== "pending") {
    return {
      status: "invalid",
      reason: "This invitation is no longer active.",
      invitationId: invitation.id,
    };
  }

  const guest = await getUserById(invitation.guestUserId);

  if (!guest) {
    return {
      status: "invalid",
      reason: "This guest profile could not be found.",
      invitationId: invitation.id,
    };
  }

  if (guest.mergedIntoUserId) {
    return guest.mergedIntoUserId === user.id
      ? {
          status: "already_claimed",
          invitationId: invitation.id,
        }
      : {
          status: "invalid",
          reason: "This guest profile has already been claimed.",
          invitationId: invitation.id,
        };
  }

  const [existingFriendship, pendingGuestInvitations] = await Promise.all([
    getFriendshipByUsers(invitation.inviterUserId, user.id),
    listPendingInvitationsForGuest(guest.id),
  ]);

  if (!existingFriendship) {
    await createFriendship({
      user1Id: invitation.inviterUserId,
      user2Id: user.id,
      inviterId: invitation.inviterUserId,
    });
  }

  await mergeGuestUserIntoUser({
    guestUserId: guest.id,
    recipientUserId: user.id,
    inviterUserId: invitation.inviterUserId,
  });

  await updateInvitation(invitation.id, {
    status: "accepted",
    acceptedByUserId: user.id,
    acceptedAt: nowIso(),
    inviteeUserId: user.id,
    guestUserId: user.id,
  });

  const invitationIdsToRevoke = pendingGuestInvitations
    .map((pendingInvitation) => pendingInvitation.id)
    .filter((id) => id !== invitation.id);

  await updateInvitationsByIds(invitationIdsToRevoke, {
    status: "revoked",
    guestUserId: user.id,
  });

  revalidateInvitationAcceptanceViews({
    inviterUserId: invitation.inviterUserId,
    inviteeUserId: user.id,
    inviteToken: invitation.inviteToken,
  });

  return {
    status: "claimed",
    invitationId: invitation.id,
  };
}

async function finalizeFriendLinkInvitationForUser(
  invitation: NonNullable<Awaited<ReturnType<typeof getInvitationFullById>>>,
  user: Awaited<ReturnType<typeof loadCurrentUser>>,
): Promise<FriendLinkFinalizeResult> {
  if (invitation.kind !== "friend" || invitation.targetType !== "link") {
    return {
      status: "invalid",
      reason: "This invitation link cannot be accepted automatically.",
      invitationId: invitation.id,
    };
  }

  if (invitation.inviterUserId === user.id) {
    return {
      status: "invalid",
      reason: "You cannot use your own invitation link.",
      invitationId: invitation.id,
    };
  }

  if (
    invitation.status === "accepted" &&
    invitation.acceptedByUserId === user.id
  ) {
    return {
      status: "already_accepted",
      invitationId: invitation.id,
    };
  }

  if (invitation.status !== "pending") {
    return {
      status: "invalid",
      reason: "This invitation is no longer active.",
      invitationId: invitation.id,
    };
  }

  const existingFriendship = await getFriendshipByUsers(
    invitation.inviterUserId,
    user.id,
  );

  if (!existingFriendship) {
    await createFriendship({
      user1Id: invitation.inviterUserId,
      user2Id: user.id,
      inviterId: invitation.inviterUserId,
    });
  }

  await updateInvitation(invitation.id, {
    status: "accepted",
    acceptedByUserId: user.id,
    acceptedAt: nowIso(),
    inviteeUserId: user.id,
  });

  revalidateInvitationAcceptanceViews({
    inviterUserId: invitation.inviterUserId,
    inviteeUserId: user.id,
    inviteToken: invitation.inviteToken,
  });

  return {
    status: existingFriendship ? "already_accepted" : "accepted",
    invitationId: invitation.id,
  };
}

export async function finalizeGuestClaimInvitation(input: {
  inviteToken: string;
}): Promise<GuestClaimResult> {
  let actorUserId: string | null = null;

  try {
    const user = await requireCurrentUser();
    actorUserId = user.id;
    const invitation = await getInvitationFullByToken(input.inviteToken);

    if (!invitation) {
      return {
        status: "invalid",
        reason: "Invitation not found.",
      };
    }

    const result = await claimGuestInvitationForUser(invitation, user);

    if (result.status !== "invalid") {
      logFriendsActionSuccess("invitation.claim_guest", {
        actorUserId: user.id,
        invitationId: invitation.id,
        resultStatus: result.status,
      });
    }

    return result;
  } catch (error) {
    logFriendsActionFailure("invitation.claim_guest", error, {
      actorUserId,
      inviteTokenPresent: Boolean(input.inviteToken),
    });
    throw error;
  }
}

export async function finalizeFriendLinkInvitation(input: {
  inviteToken: string;
}): Promise<FriendLinkFinalizeResult> {
  let actorUserId: string | null = null;

  try {
    const user = await requireCurrentUser();
    actorUserId = user.id;
    const invitation = await getInvitationFullByToken(input.inviteToken);

    if (!invitation) {
      return {
        status: "invalid",
        reason: "Invitation not found.",
      };
    }

    const result = await finalizeFriendLinkInvitationForUser(invitation, user);

    if (result.status !== "invalid") {
      logFriendsActionSuccess("invitation.link_accept", {
        actorUserId: user.id,
        invitationId: invitation.id,
        resultStatus: result.status,
      });
    }

    return result;
  } catch (error) {
    logFriendsActionFailure("invitation.link_accept", error, {
      actorUserId,
      inviteTokenPresent: Boolean(input.inviteToken),
    });
    throw error;
  }
}

export async function finalizeReusableFriendInvite(input: {
  friendInviteToken: string;
  inviteeUserId?: string;
}): Promise<
  | { status: "accepted"; inviterUserId: string }
  | { status: "already_accepted"; inviterUserId: string }
  | { status: "own_invite"; inviterUserId: string }
  | { status: "invalid"; reason: string }
> {
  let actorUserId: string | null = null;

  try {
    const user =
      input.inviteeUserId && input.inviteeUserId.length > 0
        ? await getUserById(input.inviteeUserId)
        : await requireCurrentUser();

    if (!user) {
      return {
        status: "invalid",
        reason: "User not found.",
      };
    }

    actorUserId = user.id;

    const inviter = await getUserByFriendInviteToken(input.friendInviteToken);

    if (!inviter || inviter.isGuest || inviter.mergedIntoUserId) {
      return {
        status: "invalid",
        reason: "Invitation not found.",
      };
    }

    if (inviter.id === user.id) {
      return {
        status: "own_invite",
        inviterUserId: inviter.id,
      };
    }

    const existingFriendship = await getFriendshipByUsers(inviter.id, user.id);

    if (!existingFriendship) {
      await createFriendship({
        user1Id: inviter.id,
        user2Id: user.id,
        inviterId: inviter.id,
      });
    }

    revalidateInvitationAcceptanceViews({
      inviterUserId: inviter.id,
      inviteeUserId: user.id,
    });

    logFriendsActionSuccess("invitation.reusable_link_accept", {
      actorUserId: user.id,
      inviterUserId: inviter.id,
      existingFriendship: Boolean(existingFriendship),
    });

    return {
      status: existingFriendship ? "already_accepted" : "accepted",
      inviterUserId: inviter.id,
    };
  } catch (error) {
    logFriendsActionFailure("invitation.reusable_link_accept", error, {
      actorUserId,
      inviteTokenPresent: Boolean(input.friendInviteToken),
    });
    throw error;
  }
}

export async function acceptInvitation(formData: FormData) {
  let actorUserId: string | null = null;
  const invitationId = getStringValue(formData, "invitationId");
  const inviteTokenPresent = Boolean(getStringValue(formData, "inviteToken"));

  try {
    const user = await requireCurrentUser();
    actorUserId = user.id;
    const invitation = await resolveInvitationForRecipient(formData);

    if (invitation.status !== "pending") {
      throw new Error("This invitation is no longer active");
    }

    if (!canUserActOnInvitation(invitation, user)) {
      throw new Error("You cannot accept this invitation");
    }

    if (invitation.kind === "claim_guest") {
      const result = await claimGuestInvitationForUser(invitation, user);

      if (result.status === "invalid") {
        throw new Error(result.reason);
      }

      logFriendsActionSuccess("invitation.accept", {
        actorUserId: user.id,
        invitationId: invitation.id,
        inviterUserId: invitation.inviterUserId,
        targetType: invitation.targetType,
        invitationKind: invitation.kind,
        mergedGuest: true,
        createdFriendship: result.status === "claimed",
      });
      return;
    }

    const existingFriendship = await getFriendshipByUsers(
      invitation.inviterUserId,
      user.id,
    );

    if (!existingFriendship) {
      await createFriendship({
        user1Id: invitation.inviterUserId,
        user2Id: user.id,
        inviterId: invitation.inviterUserId,
      });
    }

    await updateInvitation(invitation.id, {
      status: "accepted",
      acceptedByUserId: user.id,
      acceptedAt: nowIso(),
      inviteeUserId: invitation.inviteeUserId ?? user.id,
    });

    revalidateInvitationAcceptanceViews({
      inviterUserId: invitation.inviterUserId,
      inviteeUserId: user.id,
      inviteToken: invitation.inviteToken,
    });
    logFriendsActionSuccess("invitation.accept", {
      actorUserId: user.id,
      invitationId: invitation.id,
      inviterUserId: invitation.inviterUserId,
      targetType: invitation.targetType,
      invitationKind: invitation.kind,
      mergedGuest: false,
      createdFriendship: !existingFriendship,
    });
  } catch (error) {
    logFriendsActionFailure("invitation.accept", error, {
      actorUserId,
      invitationId: invitationId || null,
      inviteTokenPresent,
    });
    throw error;
  }
}

export async function declineInvitation(formData: FormData) {
  let actorUserId: string | null = null;
  const invitationId = getStringValue(formData, "invitationId");
  const inviteTokenPresent = Boolean(getStringValue(formData, "inviteToken"));

  try {
    const user = await requireCurrentUser();
    actorUserId = user.id;
    const invitation = await resolveInvitationForRecipient(formData);

    if (invitation.status !== "pending") {
      throw new Error("This invitation is no longer active");
    }

    if (!canUserActOnInvitation(invitation, user)) {
      throw new Error("You cannot decline this invitation");
    }

    await updateInvitation(invitation.id, {
      status: "declined",
      inviteeUserId: invitation.inviteeUserId ?? user.id,
    });

    revalidateOwnFriendsData(invitation.inviterUserId);
    revalidateOwnFriendsData(user.id);
    revalidateOwnDashboard(user.id);
    revalidateOwnProfileOverview(user.id);
    revalidateFriendsViews(invitation.inviteToken);
    revalidatePublicProfile(invitation.inviterUserId);
    revalidatePublicProfile(user.id);
    logFriendsActionSuccess("invitation.decline", {
      actorUserId: user.id,
      invitationId: invitation.id,
      inviterUserId: invitation.inviterUserId,
      targetType: invitation.targetType,
      invitationKind: invitation.kind,
    });
  } catch (error) {
    logFriendsActionFailure("invitation.decline", error, {
      actorUserId,
      invitationId: invitationId || null,
      inviteTokenPresent,
    });
    throw error;
  }
}

export async function revokeInvitation(formData: FormData) {
  let actorUserId: string | null = null;
  const invitationId = getStringValue(formData, "invitationId");

  try {
    const user = await requireCurrentUser();
    actorUserId = user.id;

    if (!invitationId) {
      throw new Error("Invitation id is required");
    }

    const invitation = await getInvitationFullById(invitationId);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.inviterUserId !== user.id) {
      throw new Error("You cannot revoke this invitation");
    }

    if (invitation.status !== "pending") {
      throw new Error("Only pending invitations can be revoked");
    }

    await updateInvitation(invitation.id, {
      status: "revoked",
    });

    revalidateOwnFriendsData(user.id);
    revalidateOwnFriendsData(invitation.inviteeUserId);
    revalidateOwnDashboard(invitation.inviteeUserId);
    revalidateFriendsViews(invitation.inviteToken);
    revalidatePublicProfile(invitation.inviterUserId);
    revalidatePublicProfile(invitation.inviteeUserId);
    logFriendsActionSuccess("invitation.revoke", {
      actorUserId: user.id,
      invitationId: invitation.id,
      targetType: invitation.targetType,
      invitationKind: invitation.kind,
      inviteeUserId: invitation.inviteeUserId,
      guestUserId: invitation.guestUserId,
    });
  } catch (error) {
    logFriendsActionFailure("invitation.revoke", error, {
      actorUserId,
      invitationId: invitationId || null,
    });
    throw error;
  }
}

export async function mergeGuestIntoFriend(input: {
  guestUserId: string;
  friendUserId: string;
}): Promise<void> {
  let actorUserId: string | null = null;
  const guestUserId = input.guestUserId.trim();
  const friendUserId = input.friendUserId.trim();

  try {
    const user = await requireCurrentUser();
    actorUserId = user.id;

    if (!guestUserId || !friendUserId) {
      throw new Error("Guest user and friend user are required");
    }

    if (friendUserId === user.id) {
      throw new Error("Choose one of your friends instead of your own account");
    }

    const friendship = await getFriendshipByUsers(user.id, friendUserId);

    if (!friendship) {
      throw new Error("You can only merge a guest into an existing friend");
    }

    const mergeResult = await mergeGuestUserIntoUser({
      guestUserId,
      recipientUserId: friendUserId,
      inviterUserId: user.id,
    });
    await revokePendingInvitationsForGuest(guestUserId);

    revalidateOwnFriendsData(user.id);
    revalidateOwnFriendsData(friendUserId);
    revalidateFriendsViews();
    logFriendsActionSuccess("guest.merge", {
      actorUserId: user.id,
      guestUserId,
      recipientUserId: friendUserId,
      mergedGamePlayerCount: mergeResult.mergedGamePlayerCount,
      deletedDuplicateGamePlayerCount: mergeResult.deletedDuplicateGamePlayerCount,
    });
  } catch (error) {
    logFriendsActionFailure("guest.merge", error, {
      actorUserId,
      guestUserId,
      recipientUserId: friendUserId,
    });
    throw error;
  }
}

export async function removeFriend(input: {
  friendUserId: string;
}): Promise<void> {
  let actorUserId: string | null = null;
  const friendUserId = input.friendUserId.trim();

  try {
    const user = await requireCurrentUser();
    actorUserId = user.id;

    if (!friendUserId) {
      throw new Error("Friend user id is required");
    }

    const friendship = await getFriendshipByUsers(user.id, friendUserId);

    if (!friendship) {
      throw new Error("Friendship not found");
    }

    await deleteFriendship(user.id, friendUserId);
    revalidateOwnFriendsData(user.id);
    revalidateOwnFriendsData(friendUserId);
    revalidateOwnProfileOverview(user.id);
    revalidateGameHistoryPage(user.id);
    revalidateGameHistoryPage(friendUserId);
    revalidateFriendsViews();
    revalidatePublicProfile(user.id);
    revalidatePublicProfile(friendUserId);
    logFriendsActionSuccess("friend.remove", {
      actorUserId: user.id,
      friendUserId,
      friendshipUser1Id: friendship.user1Id,
      friendshipUser2Id: friendship.user2Id,
    });
  } catch (error) {
    logFriendsActionFailure("friend.remove", error, {
      actorUserId,
      friendUserId,
    });
    throw error;
  }
}
