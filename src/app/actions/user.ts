"use server";

import { UserFullRow } from "@/lib/auth/user-store";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(
  userId: string, 
  data: { first_name: string; last_name: string }
) {
  await db.update(users)
    .set({
      first_name: data.first_name,
      last_name: data.last_name,
      is_profile_complete: true,
    })
    .where(eq(users.id, userId));

  revalidatePath("/profile");
}

export async function updateProfileCard(
    userId: string, 
    data: { profileCardId: string }
  ) {
    await db.update(users)
      .set({
        profile_card_id: data.profileCardId,
      })
      .where(eq(users.id, userId));
  
    revalidatePath("/profile");
  }

export async function getUserProfile(userId: string): Promise<UserFullRow | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        group: true,
        activeProfileCard: {
            with: {
                owner: true
            },
        },
        partnerInvitesSent: true,
        partnerInvitesReceived: true,
        groupReferralsSent: true,
        cards: {
            orderBy: (cards, { asc }) => [asc(cards.value)], 
        },
      },
    });
    return user ?? null;
}