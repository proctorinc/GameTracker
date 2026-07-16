"use server";

import { cookies } from "next/headers";
import {
  getUserById,
  getUserFullById,
  getOrCreateFriendInviteToken,
  updateUser,
} from "@/lib/db/store/user.store";
import { db, users } from "@/lib/db/store";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  revalidateDashboardPage,
  revalidateFriendsPage,
  revalidateProfileIdentity,
  revalidateProfileOverviewPage,
  revalidatePublicProfilePage,
} from "@/lib/cache-invalidation";
import { PROFILE_COMPLETION_BYPASS_COOKIE } from "@/lib/auth/profile-completion-cookie";
import { logError, logInfo, type LogMeta } from "@/lib/server-log";
import { areCardsEnabled } from "@/lib/db/store/feature-flags.store";

function buildInvitePath(friendInviteToken: string) {
  return `/invite/${friendInviteToken}`;
}

function logUserActionSuccess(action: string, meta: LogMeta) {
  logInfo(`user.${action}.succeeded`, meta);
}

function logUserActionFailure(
  action: string,
  error: unknown,
  meta: LogMeta,
) {
  logError(`user.${action}.failed`, error, meta);
}

export async function updateUserProfile(data: {
  firstName: string;
  lastName: string;
  color?: string;
  avatarUrl?: string | null;
}) {
  let actorUserId: string | null = null;

  try {
    const user = await loadCurrentUser();
    actorUserId = user.id;

    await db
      .update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        color: data.color,
        avatarUrl: data.avatarUrl,
        isProfileComplete: true,
      })
      .where(eq(users.id, user.id));

    revalidateProfileOverviewPage(user.id);
    revalidatePublicProfilePage(user.id);
    revalidateFriendsPage(user.id);
    revalidateDashboardPage(user.id);
    revalidateProfileIdentity();
    revalidatePath("/", "layout");
    const cookieStore = await cookies();
    cookieStore.set(PROFILE_COMPLETION_BYPASS_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 30,
    });
    logUserActionSuccess("profile.update", {
      actorUserId: user.id,
      updatedColor: Boolean(data.color),
      updatedAvatarUrl: Boolean(data.avatarUrl),
      profileCompleted: true,
    });
  } catch (error) {
    logUserActionFailure("profile.update", error, {
      actorUserId,
      updatedColor: Boolean(data.color),
      updatedAvatarUrl: Boolean(data.avatarUrl),
    });
    throw error;
  }
}

export async function updateProfileCard(data: { profileCardId: string }) {
  let actorUserId: string | null = null;

  try {
    if (!(await areCardsEnabled())) {
      throw new Error("Cards are not available yet");
    }

    const user = await loadCurrentUser();
    actorUserId = user.id;
    const ownedCard = await db.query.cards.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.id, data.profileCardId), eq(table.ownerId, user.id)),
      columns: { id: true },
    });
    if (!ownedCard) {
      throw new Error("Choose a card from your own collection");
    }

    await db
      .update(users)
      .set({
        profileCardId: data.profileCardId,
      })
      .where(eq(users.id, user.id));

    revalidateProfileOverviewPage(user.id);
    revalidatePublicProfilePage(user.id);
    logUserActionSuccess("profile_card.update", {
      actorUserId: user.id,
      profileCardId: data.profileCardId,
    });
  } catch (error) {
    logUserActionFailure("profile_card.update", error, {
      actorUserId,
      profileCardId: data.profileCardId,
    });
    throw error;
  }
}

export async function getUserProfile() {
  let actorUserId: string | null = null;

  try {
    const user = await loadCurrentUser();
    actorUserId = user.id;
    const profile = await getUserFullById(user.id);
    logUserActionSuccess("profile.read", {
      actorUserId: user.id,
      foundProfile: Boolean(profile),
    });
    return profile;
  } catch (error) {
    logUserActionFailure("profile.read", error, {
      actorUserId,
    });
    throw error;
  }
}

export async function updateOwnedGuestColor(data: {
  guestUserId: string;
  color: string;
  gameId?: string;
}) {
  let actorUserId: string | null = null;

  try {
    const user = await loadCurrentUser();
    actorUserId = user.id;
    const targetUser = await getUserById(data.guestUserId);

    if (!targetUser) {
      throw new Error("User not found");
    }

    const isCurrentUser = targetUser.id === user.id;
    const isOwnedGuest =
      targetUser.isGuest && targetUser.created_by_user_id === user.id;

    if (!isCurrentUser && !isOwnedGuest) {
      throw new Error("You can only update yourself or guests you created");
    }

    await updateUser(targetUser.id, {
      color: data.color,
    });

    revalidateFriendsPage(user.id);

    if (targetUser.id === user.id) {
      revalidateProfileOverviewPage(user.id);
      revalidatePublicProfilePage(user.id);
    }

    revalidateDashboardPage(user.id);
    revalidateProfileIdentity();
    revalidatePath("/", "layout");

    if (data.gameId) {
      revalidatePath(`/game/${data.gameId}/play`);
    }

    logUserActionSuccess("color.update", {
      actorUserId: user.id,
      targetUserId: targetUser.id,
      targetIsGuest: targetUser.isGuest,
      gameId: data.gameId ?? null,
    });
  } catch (error) {
    logUserActionFailure("color.update", error, {
      actorUserId,
      targetUserId: data.guestUserId,
      gameId: data.gameId ?? null,
    });
    throw error;
  }
}

export async function getOrCreateFriendInviteLink(): Promise<{
  invitePath: string;
}> {
  let actorUserId: string | null = null;

  try {
    const user = await loadCurrentUser();
    actorUserId = user.id;

    if (user.friendInviteToken) {
      return {
        invitePath: buildInvitePath(user.friendInviteToken),
      };
    }

    const friendInviteToken = await getOrCreateFriendInviteToken(user.id);

    revalidateProfileOverviewPage(user.id);
    revalidatePublicProfilePage(user.id);
    revalidateFriendsPage(user.id);

    logUserActionSuccess("friend_invite_link.create", {
      actorUserId: user.id,
      friendInviteTokenCreated: true,
    });

    return {
      invitePath: buildInvitePath(friendInviteToken),
    };
  } catch (error) {
    logUserActionFailure("friend_invite_link.create", error, {
      actorUserId,
    });
    throw error;
  }
}
