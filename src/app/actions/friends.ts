"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import { normalizePhoneToE164 } from "@/lib/auth/phone";
import {
  createFriendship,
  createInvitation,
  deleteFriendship,
  findPendingInvitationForPhoneTarget,
  findPendingInvitationForUserTarget,
  getFriendshipByUsers,
  getInvitationFullById,
  getInvitationFullByToken,
  getUserById,
  getUserByPhoneNumber,
  updateInvitation,
  mergeGuestUserIntoUser,
  revokePendingInvitationsForGuest,
} from "@/lib/db/store";

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
  revalidatePath("/friends");

  if (inviteToken) {
    revalidatePath(buildInvitePath(inviteToken));
  }
}

function revalidatePublicProfile(userId?: string | null) {
  if (!userId) {
    return;
  }

  revalidatePath(`/profile/${userId}`);
}

export async function createFriendInvitationByUserId(input: {
  inviteeUserId: string;
  guestUserId?: string | null;
}): Promise<{ invitationId: string; targetType: "user" }> {
  const user = await requireCurrentUser();
  const inviteeUserId = input.inviteeUserId.trim();
  const guestUserId = input.guestUserId?.trim() || null;

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
    revalidateFriendsViews();
    revalidatePublicProfile(user.id);
    revalidatePublicProfile(inviteeUserId);
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

  revalidateFriendsViews();
  revalidatePublicProfile(user.id);
  revalidatePublicProfile(inviteeUserId);

  return {
    invitationId: invitation.id,
    targetType: "user",
  };
}

export async function createFriendInvitationByPhone(
  formData: FormData,
): Promise<{ invitationId: string; targetType: "user" | "phone" }> {
  const user = await requireCurrentUser();
  const phoneInput = getStringValue(formData, "phoneNumber");
  const guestUserId = getStringValue(formData, "guestUserId") || null;
  const normalizedPhone = normalizePhoneToE164(phoneInput);

  if (typeof normalizedPhone !== "string") {
    throw new Error(normalizedPhone.message);
  }

  if (user.phoneNumber && normalizedPhone === user.phoneNumber) {
    throw new Error("You cannot invite your own phone number");
  }

  const existing = await findPendingInvitationForPhoneTarget({
    inviterUserId: user.id,
    inviteePhoneNumber: normalizedPhone,
    guestUserId,
  });

  if (existing) {
    revalidateFriendsViews();
    return {
      invitationId: existing.id,
      targetType: "phone",
    };
  }

  const existingUser = await getUserByPhoneNumber(normalizedPhone);

  if (existingUser) {
    return createFriendInvitationByUserId({
      inviteeUserId: existingUser.id,
      guestUserId,
    });
  }

  const invitation = await createInvitation({
    inviterUserId: user.id,
    targetType: "phone",
    inviteePhoneNumber: normalizedPhone,
    guestUserId,
    kind: guestUserId ? "claim_guest" : "friend",
    status: "pending",
  });

  revalidateFriendsViews();

  return {
    invitationId: invitation.id,
    targetType: "phone",
  };
}

export async function createFriendInvitationLink(
  formData: FormData,
): Promise<{ invitationId: string; invitePath: string | null }> {
  const user = await requireCurrentUser();
  const guestUserId = getStringValue(formData, "guestUserId") || null;

  const invitation = await createInvitation({
    inviterUserId: user.id,
    targetType: "link",
    inviteToken: createInviteToken(),
    guestUserId,
    kind: guestUserId ? "claim_guest" : "friend",
    status: "pending",
  });

  revalidateFriendsViews(invitation.inviteToken);

  return {
    invitationId: invitation.id,
    invitePath: invitation.inviteToken
      ? buildInvitePath(invitation.inviteToken)
      : null,
  };
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

  if (invitation.targetType === "phone") {
    return Boolean(user.phoneNumber) && invitation.inviteePhoneNumber === user.phoneNumber;
  }

  return invitation.inviterUserId !== user.id;
}

export async function acceptInvitation(formData: FormData) {
  const user = await requireCurrentUser();
  const invitation = await resolveInvitationForRecipient(formData);

  if (invitation.status !== "pending") {
    throw new Error("This invitation is no longer active");
  }

  if (!canUserActOnInvitation(invitation, user)) {
    throw new Error("You cannot accept this invitation");
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

  if (invitation.kind === "claim_guest" && invitation.guestUserId) {
    await mergeGuestUserIntoUser({
      guestUserId: invitation.guestUserId,
      recipientUserId: user.id,
      inviterUserId: invitation.inviterUserId,
    });
    await revokePendingInvitationsForGuest(invitation.guestUserId, invitation.id);
  }

  await updateInvitation(invitation.id, {
    status: "accepted",
    acceptedByUserId: user.id,
    acceptedAt: nowIso(),
    inviteeUserId: invitation.inviteeUserId ?? user.id,
  });

  revalidateFriendsViews(invitation.inviteToken);
  revalidatePublicProfile(invitation.inviterUserId);
  revalidatePublicProfile(user.id);
}

export async function declineInvitation(formData: FormData) {
  const user = await requireCurrentUser();
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

  revalidateFriendsViews(invitation.inviteToken);
  revalidatePublicProfile(invitation.inviterUserId);
  revalidatePublicProfile(user.id);
}

export async function revokeInvitation(formData: FormData) {
  const user = await requireCurrentUser();
  const invitationId = getStringValue(formData, "invitationId");

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

  revalidateFriendsViews(invitation.inviteToken);
  revalidatePublicProfile(invitation.inviterUserId);
  revalidatePublicProfile(invitation.inviteeUserId);
}

export async function mergeGuestIntoFriend(input: {
  guestUserId: string;
  friendUserId: string;
}): Promise<void> {
  const user = await requireCurrentUser();
  const guestUserId = input.guestUserId.trim();
  const friendUserId = input.friendUserId.trim();

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

  await mergeGuestUserIntoUser({
    guestUserId,
    recipientUserId: friendUserId,
    inviterUserId: user.id,
  });
  await revokePendingInvitationsForGuest(guestUserId);

  revalidateFriendsViews();
}

export async function removeFriend(input: {
  friendUserId: string;
}): Promise<void> {
  const user = await requireCurrentUser();
  const friendUserId = input.friendUserId.trim();

  if (!friendUserId) {
    throw new Error("Friend user id is required");
  }

  const friendship = await getFriendshipByUsers(user.id, friendUserId);

  if (!friendship) {
    throw new Error("Friendship not found");
  }

  await deleteFriendship(user.id, friendUserId);
  revalidateFriendsViews();
  revalidatePublicProfile(user.id);
  revalidatePublicProfile(friendUserId);
}
