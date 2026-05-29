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

export async function updateUserProfile(data: {
  firstName: string;
  lastName: string;
  color?: string;
}) {
  const user = await loadCurrentUser();

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
}

export async function updateProfileCard(data: { profileCardId: string }) {
  const user = await loadCurrentUser();

  await db
    .update(users)
    .set({
      profileCardId: data.profileCardId,
    })
    .where(eq(users.id, user.id));

  revalidatePath("/profile");
  revalidatePath(`/profile/${user.id}`);
}

export async function getUserProfile() {
  const user = await loadCurrentUser();
  return getUserFullById(user.id);
}

export async function updateOwnedGuestColor(data: {
  guestUserId: string;
  color: string;
  gameId?: string;
}) {
  const user = await loadCurrentUser();
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
}
