import { eq, sql } from "drizzle-orm";
import { isDev } from "@/lib/env";
import {
  db,
  groups,
  users,
  sessions,
  partnerInvites,
  groupReferrals,
  otpRateLimits,
} from "@/lib/db";
import {
  createGroup,
  createInvitedUser,
  invitePartnerToGroup,
  respondToPartnerInvite,
  createReferralInvite,
  respondToReferral,
  confirmReferralAsReferrer,
} from "@/lib/db/group-store";
import { createVerifiedUserWithGroup, markPhoneVerified } from "@/lib/auth/user-store";
import { DEMO_HUB_PHONE, demoLocation, demoName, demoPhone } from "./seed-data";

const SEED_VERSION = 2;
const DEFAULT_MIN_USERS = 100;

export async function clearDevData(): Promise<void> {
  await db.delete(otpRateLimits);
  await db.delete(sessions);
  await db.delete(partnerInvites);
  await db.delete(groupReferrals);
  await db.delete(users);
  await db.delete(groups);
}

async function countUsers(): Promise<number> {
  const row = await db.select({ count: sql<number>`count(*)` }).from(users).get();
  return Number(row?.count ?? 0);
}

/** Solo verified self-signup group. */
async function seedSoloVerified(startSeq: number, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    const seq = startSeq + i;
    const loc = i % 2 === 0 ? demoLocation(seq) : null;
    await createVerifiedUserWithGroup(demoPhone(seq), {
      ...demoName(seq),
      ...(loc
        ? {
            city: loc.city,
            region: loc.region,
            latitude: loc.latitude,
            longitude: loc.longitude,
          }
        : {}),
    });
  }
}

/** Solo unverified placeholder (invited, not logged in). */
async function seedSoloUnverified(startSeq: number, count: number): Promise<void> {
  const sponsor = await db
    .select()
    .from(users)
    .where(eq(users.phone_e164, demoPhone(1001)))
    .get();
  if (!sponsor) {
    throw new Error("Seed requires solo verified user at +15550001001 first");
  }

  for (let i = 0; i < count; i++) {
    const seq = startSeq + i;
    const group = await createGroup();
    await createInvitedUser({
      phone_e164: demoPhone(seq),
      group_id: group.id,
      ...demoName(seq),
      created_by_user_id: sponsor.id,
    });
  }
}

/** Two-user group with partner invite in given status. */
async function seedCouple(
  seq: number,
  status: "pending" | "accepted" | "declined",
): Promise<void> {
  const primaryPhone = demoPhone(seq);
  const partnerPhone = demoPhone(seq + 10_000);
  const primary = await createVerifiedUserWithGroup(primaryPhone, {
    ...demoName(seq),
    ...demoLocation(seq),
  });
  const { invite } = await invitePartnerToGroup({
    group_id: primary.group_id!,
    phone_e164: partnerPhone,
    ...demoName(seq + 1),
    invited_by_user_id: primary.id,
  });

  if (status === "pending") {
    return;
  }

  await respondToPartnerInvite(invite.id, primary.group_id!, status);
  if (status === "accepted") {
    await markPhoneVerified(
      (await db.select().from(users).where(eq(users.phone_e164, partnerPhone)).get())!.id,
    );
  }
}

/** Referral edge with optional response and referrer confirmation. */
async function seedReferral(
  referrerSeq: number,
  refereeSeq: number,
  options: {
    status?: "pending" | "accepted" | "declined";
    referrerConfirmed?: boolean;
    withLocation?: boolean;
  } = {},
): Promise<void> {
  const referrer = await db
    .select()
    .from(users)
    .where(eq(users.phone_e164, demoPhone(referrerSeq)))
    .get();

  if (!referrer?.group_id) {
    throw new Error(`Referrer not found for seq ${referrerSeq}`);
  }

  const loc = options.withLocation ? demoLocation(refereeSeq) : undefined;
  const { refereeGroup, referral } = await createReferralInvite({
    referrer_group_id: referrer.group_id,
    invited_by_user_id: referrer.id,
    referee: {
      phone_e164: demoPhone(refereeSeq),
      ...demoName(refereeSeq),
    },
    location: loc
      ? {
          city: loc.city,
          region: loc.region,
          latitude: loc.latitude,
          longitude: loc.longitude,
        }
      : undefined,
  });

  const status = options.status ?? "pending";
  if (status === "pending") {
    return;
  }

  await respondToReferral(referral.id, refereeGroup.id, status);
  if (status === "accepted" && options.referrerConfirmed) {
    await confirmReferralAsReferrer(referral.id, referrer.group_id);
  }
  if (status === "accepted") {
    const refereeUser = await db
      .select()
      .from(users)
      .where(eq(users.phone_e164, demoPhone(refereeSeq)))
      .get();
    if (refereeUser && !refereeUser.phone_verified_at) {
      await markPhoneVerified(refereeUser.id);
    }
  }
}

/** Linear referral chain: seq0 → seq1 → seq2 → seq3 */
async function seedReferralChain(baseSeq: number, length: number): Promise<void> {
  await createVerifiedUserWithGroup(demoPhone(baseSeq), {
    ...demoName(baseSeq),
    ...demoLocation(baseSeq),
  });

  for (let i = 1; i < length; i++) {
    await seedReferral(baseSeq + i - 1, baseSeq + i, {
      status: "accepted",
      referrerConfirmed: i % 2 === 0,
      withLocation: true,
    });
  }
}

/** Hub group with spokes; hub uses fixed DEMO_HUB_PHONE. */
async function seedReferralStar(hubSeq: number, spokeCount: number): Promise<void> {
  await createVerifiedUserWithGroup(DEMO_HUB_PHONE, {
    ...demoName(hubSeq),
    ...demoLocation(hubSeq),
  });

  for (let i = 0; i < spokeCount; i++) {
    await seedReferral(hubSeq, hubSeq + 20_000 + i, {
      status: i % 3 === 0 ? "pending" : i % 3 === 1 ? "accepted" : "declined",
      referrerConfirmed: i % 2 === 0,
      withLocation: i % 2 === 0,
    });
  }
}

async function runSeedScenarios(): Promise<void> {
  // Solo verified (25)
  await seedSoloVerified(1001, 25);
  // Solo unverified placeholders (15)
  await seedSoloUnverified(1200, 15);
  // Couples: accepted (20), pending (5), declined (5)
  for (let i = 0; i < 20; i++) {
    await seedCouple(2000 + i, "accepted");
  }
  for (let i = 0; i < 5; i++) {
    await seedCouple(3000 + i, "pending");
  }
  for (let i = 0; i < 5; i++) {
    await seedCouple(4000 + i, "declined");
  }
  // Referral-only groups from existing referrers
  for (let i = 0; i < 15; i++) {
    await seedReferral(1001 + (i % 20), 5000 + i, { status: "pending", withLocation: i % 2 === 0 });
  }
  for (let i = 0; i < 8; i++) {
    await seedReferral(1001 + (i % 20), 6000 + i, {
      status: "accepted",
      referrerConfirmed: i % 2 === 0,
    });
  }
  for (let i = 0; i < 4; i++) {
    await seedReferral(1001 + (i % 20), 7000 + i, { status: "declined" });
  }
  // Chain A → B → C → D
  await seedReferralChain(8000, 4);
  // Star hub
  await seedReferralStar(9999, 12);
  // Extra solo groups to pad counts
  await seedSoloVerified(9000, 10);
}

/**
 * Load development demo data. Idempotent unless DEV_SEED_RESET=1 or DEV_SEED_FORCE=1.
 */
export async function runDevSeed(): Promise<{ seeded: boolean; userCount: number }> {
  if (!isDev()) {
    throw new Error("Dev seed can only run when APP_ENV=development");
  }

  const minUsers = Number(process.env.DEV_SEED_MIN_USERS ?? DEFAULT_MIN_USERS);
  const existing = await countUsers();

  if (process.env.DEV_SEED_RESET === "1") {
    console.log("[dev-seed] Resetting database…");
    await clearDevData();
  } else if (
    existing >= minUsers &&
    process.env.DEV_SEED_FORCE !== "1"
  ) {
    console.log(`[dev-seed] Skipping (${existing} users, min ${minUsers}). Set DEV_SEED_FORCE=1 to re-seed.`);
    return { seeded: false, userCount: existing };
  }

  if (process.env.DEV_SEED_FORCE === "1" && process.env.DEV_SEED_RESET !== "1") {
    await clearDevData();
  }

  console.log(`[dev-seed] Seeding demo data (v${SEED_VERSION})…`);
  await runSeedScenarios();

  const userCount = await countUsers();
  const groupCount = Number(
    (await db.select({ count: sql<number>`count(*)` }).from(groups).get())?.count ?? 0,
  );
  console.log(`[dev-seed] Done: ${userCount} users, ${groupCount} groups. Hub login: ${DEMO_HUB_PHONE}`);

  return { seeded: true, userCount };
}
