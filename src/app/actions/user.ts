"use server";

import {
  getUserById,
  getUserFullById,
  updateUser,
} from "@/lib/db/store/user.store";
import { db, users } from "@/lib/db/store";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import { logError, logInfo, type LogMeta } from "@/lib/server-log";

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
        isProfileComplete: true,
      })
      .where(eq(users.id, user.id));

    revalidatePath("/profile");
    revalidatePath(`/profile/${user.id}`);
    logUserActionSuccess("profile.update", {
      actorUserId: user.id,
      updatedColor: Boolean(data.color),
      profileCompleted: true,
    });
  } catch (error) {
    logUserActionFailure("profile.update", error, {
      actorUserId,
      updatedColor: Boolean(data.color),
    });
    throw error;
  }
}

export async function updateProfileCard(data: { profileCardId: string }) {
  let actorUserId: string | null = null;

  try {
    const user = await loadCurrentUser();
    actorUserId = user.id;

    await db
      .update(users)
      .set({
        profileCardId: data.profileCardId,
      })
      .where(eq(users.id, user.id));

    revalidatePath("/profile");
    revalidatePath(`/profile/${user.id}`);
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

    revalidatePath("/friends");
    revalidatePath("/dashboard");

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
