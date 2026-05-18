import { eq, and, or, inArray, sql } from "drizzle-orm";
import {
  db,
  groups,
  users,
  partnerInvites,
  groupReferrals,
  type InviteStatus,
} from "./index";
export type GroupRow = typeof groups.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type PartnerInviteRow = typeof partnerInvites.$inferSelect;
export type GroupReferralRow = typeof groupReferrals.$inferSelect;

function nowIso(): string {
  return new Date().toISOString();
}

export function formatDisplayLocation(city: string, region: string): string {
  return `${city}, ${region}`;
}

export async function createGroup(input?: {
  city?: string;
  region?: string;
  country?: string;
  display_location?: string;
  latitude?: number;
  longitude?: number;
}): Promise<GroupRow> {
  const timestamp = nowIso();
  const [group] = await db
    .insert(groups)
    .values({
      city: input?.city ?? null,
      region: input?.region ?? null,
      country: input?.country ?? "US",
      display_location: input?.display_location ?? null,
      latitude: input?.latitude ?? null,
      longitude: input?.longitude ?? null,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .returning();

  return group;
}

export async function updateGroupLocation(
  groupId: string,
  input: {
    city: string;
    region: string;
    country?: string;
    latitude: number;
    longitude: number;
  },
): Promise<GroupRow> {
  const display_location = formatDisplayLocation(input.city, input.region);
  const [group] = await db
    .update(groups)
    .set({
      city: input.city,
      region: input.region,
      country: input.country ?? "US",
      display_location,
      latitude: input.latitude,
      longitude: input.longitude,
      updated_at: nowIso(),
    })
    .where(eq(groups.id, groupId))
    .returning();

  return group;
}

export async function getGroupById(groupId: string): Promise<GroupRow | null> {
  const row = await db.select().from(groups).where(eq(groups.id, groupId)).get();
  return row ?? null;
}

export async function getUsersInGroup(groupId: string): Promise<UserRow[]> {
  return db.select().from(users).where(eq(users.group_id, groupId));
}

export async function createInvitedUser(input: {
  phone_e164: string;
  group_id: string;
  first_name?: string;
  last_name?: string;
  created_by_user_id: string;
}): Promise<UserRow> {
  const timestamp = nowIso();
  const [user] = await db
    .insert(users)
    .values({
      phone_e164: input.phone_e164,
      group_id: input.group_id,
      first_name: input.first_name ?? null,
      last_name: input.last_name ?? null,
      phone_verified_at: null,
      created_by_user_id: input.created_by_user_id,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .returning();

  return user;
}

/** Verified user invites a partner into their group (creates placeholder user if needed). */
export async function invitePartnerToGroup(input: {
  group_id: string;
  phone_e164: string;
  first_name?: string;
  last_name?: string;
  invited_by_user_id: string;
}): Promise<{ invite: PartnerInviteRow; invitedUser: UserRow }> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.phone_e164, input.phone_e164))
    .get();

  if (existing && existing.group_id !== input.group_id) {
    throw new Error("User already belongs to another group");
  }

  const invitedUser =
    existing ??
    (await createInvitedUser({
      phone_e164: input.phone_e164,
      group_id: input.group_id,
      first_name: input.first_name,
      last_name: input.last_name,
      created_by_user_id: input.invited_by_user_id,
    }));

  const invite = await createPartnerInvite({
    ...input,
    invited_user_id: invitedUser.id,
  });

  return { invite, invitedUser };
}

export async function respondToPartnerInvite(
  inviteId: string,
  groupId: string,
  status: Extract<InviteStatus, "accepted" | "declined">,
): Promise<PartnerInviteRow | null> {
  const [invite] = await db
    .update(partnerInvites)
    .set({ status, responded_at: nowIso() })
    .where(
      and(
        eq(partnerInvites.id, inviteId),
        eq(partnerInvites.group_id, groupId),
        eq(partnerInvites.status, "pending"),
      ),
    )
    .returning();

  return invite ?? null;
}

export async function createPartnerInvite(input: {
  group_id: string;
  phone_e164: string;
  first_name?: string;
  last_name?: string;
  invited_by_user_id: string;
  invited_user_id?: string;
}): Promise<PartnerInviteRow> {
  const [invite] = await db
    .insert(partnerInvites)
    .values({
      group_id: input.group_id,
      phone_e164: input.phone_e164,
      first_name: input.first_name ?? null,
      last_name: input.last_name ?? null,
      invited_by_user_id: input.invited_by_user_id,
      invited_user_id: input.invited_user_id ?? null,
      status: "pending",
      invited_at: nowIso(),
    })
    .returning();

  return invite;
}

export async function createReferralClaim(input: {
  referrer_group_id: string;
  referee_group_id: string;
  invited_by_user_id: string;
}): Promise<GroupReferralRow> {
  const [referral] = await db
    .insert(groupReferrals)
    .values({
      referrer_group_id: input.referrer_group_id,
      referee_group_id: input.referee_group_id,
      invited_by_user_id: input.invited_by_user_id,
      status: "pending",
      invited_at: nowIso(),
    })
    .returning();

  return referral;
}

/** Referral invite: new referee group + placeholder user(s) + pending edge. */
export async function createReferralInvite(input: {
  referrer_group_id: string;
  invited_by_user_id: string;
  referee: {
    phone_e164: string;
    first_name?: string;
    last_name?: string;
  };
  location?: {
    city: string;
    region: string;
    country?: string;
    latitude: number;
    longitude: number;
  };
}): Promise<{ refereeGroup: GroupRow; refereeUser: UserRow; referral: GroupReferralRow }> {
  const refereeGroup = await createGroup(
    input.location
      ? {
          city: input.location.city,
          region: input.location.region,
          country: input.location.country,
          display_location: formatDisplayLocation(
            input.location.city,
            input.location.region,
          ),
          latitude: input.location.latitude,
          longitude: input.location.longitude,
        }
      : undefined,
  );

  const refereeUser = await createInvitedUser({
    phone_e164: input.referee.phone_e164,
    group_id: refereeGroup.id,
    first_name: input.referee.first_name,
    last_name: input.referee.last_name,
    created_by_user_id: input.invited_by_user_id,
  });

  const referral = await createReferralClaim({
    referrer_group_id: input.referrer_group_id,
    referee_group_id: refereeGroup.id,
    invited_by_user_id: input.invited_by_user_id,
  });

  return { refereeGroup, refereeUser, referral };
}

export async function respondToReferral(
  referralId: string,
  refereeGroupId: string,
  status: Extract<InviteStatus, "accepted" | "declined">,
): Promise<GroupReferralRow | null> {
  const timestamp = nowIso();
  const [referral] = await db
    .update(groupReferrals)
    .set({
      status,
      responded_at: timestamp,
      referee_confirmed_at: status === "accepted" ? timestamp : null,
    })
    .where(
      and(
        eq(groupReferrals.id, referralId),
        eq(groupReferrals.referee_group_id, refereeGroupId),
        eq(groupReferrals.status, "pending"),
      ),
    )
    .returning();

  return referral ?? null;
}

export async function confirmReferralAsReferrer(
  referralId: string,
  referrerGroupId: string,
): Promise<GroupReferralRow | null> {
  const [referral] = await db
    .update(groupReferrals)
    .set({ referrer_confirmed_at: nowIso() })
    .where(
      and(
        eq(groupReferrals.id, referralId),
        eq(groupReferrals.referrer_group_id, referrerGroupId),
        eq(groupReferrals.status, "accepted"),
      ),
    )
    .returning();

  return referral ?? null;
}

export interface ReferralNetwork {
  groups: GroupRow[];
  referrals: GroupReferralRow[];
}

/** Undirected walk for reachable groups; returns directed edges inside the component. */
export async function getReferralNetwork(groupId: string): Promise<ReferralNetwork> {
  const activeStatuses: InviteStatus[] = ["pending", "accepted"];

  const reachable = await db.all<{ group_id: string }>(sql`
    WITH RECURSIVE reachable(group_id) AS (
      SELECT ${groupId}
      UNION
      SELECT gr.referee_group_id
      FROM group_referrals gr
      INNER JOIN reachable r ON gr.referrer_group_id = r.group_id
      WHERE gr.status IN ('pending', 'accepted')
      UNION
      SELECT gr.referrer_group_id
      FROM group_referrals gr
      INNER JOIN reachable r ON gr.referee_group_id = r.group_id
      WHERE gr.status IN ('pending', 'accepted')
    )
    SELECT group_id FROM reachable
  `);

  const groupIds = reachable.map((r) => r.group_id);
  if (groupIds.length === 0) {
    return { groups: [], referrals: [] };
  }

  const groupRows = await db.select().from(groups).where(inArray(groups.id, groupIds));

  const referrals = await db
    .select()
    .from(groupReferrals)
    .where(
      and(
        inArray(groupReferrals.referrer_group_id, groupIds),
        inArray(groupReferrals.referee_group_id, groupIds),
        inArray(groupReferrals.status, activeStatuses),
      ),
    );

  return { groups: groupRows, referrals };
}

export async function getPendingReferralsForGroup(groupId: string): Promise<GroupReferralRow[]> {
  return db
    .select()
    .from(groupReferrals)
    .where(
      and(
        eq(groupReferrals.status, "pending"),
        or(
          eq(groupReferrals.referrer_group_id, groupId),
          eq(groupReferrals.referee_group_id, groupId),
        ),
      ),
    );
}
