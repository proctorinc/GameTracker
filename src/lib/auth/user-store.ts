import { desc, eq } from "drizzle-orm";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cards, db, groupReferrals, groups, partnerInvites, sessions, users } from "../db";
import { createGroup } from "../db/group-store";

export type UserRow = typeof users.$inferSelect;
export type UserFullRow = UserRow & {
  group?: typeof groups.$inferSelect | null;
  activeProfileCard?: typeof cards.$inferSelect | null;
  partnerInvitesSent?: Array<typeof partnerInvites.$inferSelect>;
  partnerInvitesReceived?: Array<typeof partnerInvites.$inferSelect>;
  groupReferralsSent?: Array<typeof groupReferrals.$inferSelect>;
  cards?: Array<typeof cards.$inferSelect>;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Check if user's phone is verified */
export function isPhoneVerified(user: Pick<UserRow, "phone_verified_at">): boolean {
  return user.phone_verified_at != null;
}

/** Find user by E.164 phone number */
export async function findUserByPhone(phoneE164: string): Promise<UserRow | null> {
  const result = await db.select().from(users).where(eq(users.phone_e164, phoneE164)).get();
  return result ?? null;
}

/** Find user by ID */
export async function findUserById(userId: string): Promise<UserRow | null> {
  const result = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      cards: {
        with: {
          owner: true,
        }
      }
    }
  });
  return result ?? null;
}

export async function getUserFullById(userId: string): Promise<UserFullRow | null> {
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
        orderBy: (cards, { asc }) => [
          asc(cards.value),
          desc(cards.weight),
        ], 
      },
    },
  });
  return user ?? null;
}

/**
 * Self-signup or post-OTP: create group + verified user atomically.
 */
export async function createVerifiedUserWithGroup(
  phoneE164: string,
  profile?: {
    first_name?: string;
    last_name?: string;
    group_id?: string;
    city?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  },
): Promise<UserRow> {
  const timestamp = nowIso();
  const groupId =
    profile?.group_id ??
    (
      await createGroup(
        profile?.city && profile?.region
          ? {
              city: profile.city,
              region: profile.region,
              latitude: profile.latitude,
              longitude: profile.longitude,
              display_location: `${profile.city}, ${profile.region}`,
            }
          : undefined,
      )
    ).id;

  const [user] = await db
    .insert(users)
    .values({
      phone_e164: phoneE164,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      group_id: groupId,
      phone_verified_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .returning();

  return user;
}

/** Mark a user's phone as verified */
export async function markPhoneVerified(userId: string): Promise<UserRow> {
  const timestamp = nowIso();
  const [user] = await db
    .update(users)
    .set({ phone_verified_at: timestamp, updated_at: timestamp })
    .where(eq(users.id, userId))
    .returning();

  return user;
}

/**
 * After OTP success: ensure user exists and phone is verified.
 * New phones get a new group (self-registered); invited users keep their existing group.
 */
export async function ensureUserVerifiedAfterOtp(
  phoneE164: string,
  profile?: { first_name?: string; last_name?: string },
): Promise<UserRow> {
  const existing = await findUserByPhone(phoneE164);

  if (!existing) {
    return createVerifiedUserWithGroup(phoneE164, { ...profile });
  }

  if (!isPhoneVerified(existing)) {
    return markPhoneVerified(existing.id);
  }

  return existing;
}
