import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const inviteStatuses = ["pending", "accepted", "declined"] as const;
export type InviteStatus = (typeof inviteStatuses)[number];

export const groups = sqliteTable("groups", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId()),
  city: text("city"),
  region: text("region"),
  country: text("country").default("US"),
  display_location: text("display_location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  created_at: text("created_at"),
  updated_at: text("updated_at"),
});

export const users = sqliteTable("users", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId()),
  phone_e164: text("phone_e164", { length: 20 }).notNull().unique(),
  first_name: text("first_name"),
  last_name: text("last_name"),
  phone_verified_at: text("phone_verified_at"),
  group_id: text("group_id").references(() => groups.id),
  created_by_user_id: text("created_by_user_id"),
  created_at: text("created_at"),
  updated_at: text("updated_at"),
});

export const sessions = sqliteTable("sessions", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId()),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  token_hash: text("token_hash", { length: 65 }).unique(),
  expires_at: integer("expires_at", { mode: "timestamp" }),
  created_at: text("created_at"),
});

export const otpRateLimits = sqliteTable("otp_rate_limits", {
  phone_e164: text("phone_e164", { length: 20 }).notNull().primaryKey(),
  last_request_at: integer("last_request_at", { mode: "timestamp" }),
  request_count_window: integer("request_count_window").default(0),
});

/** Second person joining an existing group. */
export const partnerInvites = sqliteTable("partner_invites", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId()),
  group_id: text("group_id")
    .notNull()
    .references(() => groups.id),
  phone_e164: text("phone_e164", { length: 20 }).notNull(),
  first_name: text("first_name"),
  last_name: text("last_name"),
  invited_by_user_id: text("invited_by_user_id")
    .notNull()
    .references(() => users.id),
  invited_user_id: text("invited_user_id").references(() => users.id),
  status: text("status").$type<InviteStatus>().notNull().default("pending"),
  invited_at: text("invited_at").notNull(),
  responded_at: text("responded_at"),
});

/** Directed referral edge between groups (referrer → referee). */
export const groupReferrals = sqliteTable(
  "group_referrals",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    referrer_group_id: text("referrer_group_id")
      .notNull()
      .references(() => groups.id),
    referee_group_id: text("referee_group_id")
      .notNull()
      .references(() => groups.id),
    invited_by_user_id: text("invited_by_user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").$type<InviteStatus>().notNull().default("pending"),
    invited_at: text("invited_at").notNull(),
    responded_at: text("responded_at"),
    referrer_confirmed_at: text("referrer_confirmed_at"),
    referee_confirmed_at: text("referee_confirmed_at"),
  },
  (table) => [
    uniqueIndex("group_referrals_pair_unique").on(
      table.referrer_group_id,
      table.referee_group_id,
    ),
  ],
);
