import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";

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
  profile_card_id: text("profile_card_id"), 
  phone_e164: text("phone_e164", { length: 20 }).notNull().unique(),
  first_name: text("first_name"),
  last_name: text("last_name"),
  phone_verified_at: text("phone_verified_at"),
  group_id: text("group_id").references(() => groups.id).notNull(),
  created_by_user_id: text("created_by_user_id"),
  is_profile_complete: integer("is_profile_complete", { mode: "boolean" }).default(false),
  created_at: text("created_at"),
  updated_at: text("updated_at"),
});

export const cards = sqliteTable("cards", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId()),
  owner_id: text("user_id")
    .notNull()
    .references(() => users.id),
  value: integer("value").notNull(), // -2 to 12
  suit: text("suit").notNull(), // RED, GREEN, etc.
  weight: integer("weight").notNull(), // Holographic 3 should be greater than 3
  deck: text("deck").notNull().default("Standard"), // standard, deluxe, etc.
  modifier: text("modifier").notNull().default("Basic"), // basic, Holographic, etc.
  probability: integer("exact_pull_chance").notNull(),
  suit_probability: integer("generic_pull_chance").notNull(),
  created_at: text("created_at"),
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
  expires_at: text("expires_at"),
  created_at: text("created_at"),
});

export const otpRateLimits = sqliteTable("otp_rate_limits", {
  phone_e164: text("phone_e164", { length: 20 }).notNull().primaryKey(),
  last_request_at: text("last_request_at"),
  request_count_window: integer("request_count_window").default(0),
});

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

export const groupsRelations = relations(groups, ({ many }) => ({
  users: many(users),
  partnerInvites: many(partnerInvites),
  referralsSent: many(groupReferrals, { relationName: "referrerGroup" }),
  referralsReceived: many(groupReferrals, { relationName: "refereeGroup" }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  group: one(groups, {
    fields: [users.group_id],
    references: [groups.id],
  }),
  activeProfileCard: one(cards, {
    fields: [users.profile_card_id],
    references: [cards.id],
  }),
  cards: many(cards),
  sessions: many(sessions),
  
  partnerInvitesSent: many(partnerInvites, { relationName: "inviter" }),
  partnerInvitesReceived: many(partnerInvites, { relationName: "invitee" }),
  
  groupReferralsSent: many(groupReferrals),
}));

export const cardsRelations = relations(cards, ({ one }) => ({
  owner: one(users, {
    fields: [cards.owner_id],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.user_id],
    references: [users.id],
  }),
}));

export const partnerInvitesRelations = relations(partnerInvites, ({ one }) => ({
  group: one(groups, {
    fields: [partnerInvites.group_id],
    references: [groups.id],
  }),
  invitedBy: one(users, {
    fields: [partnerInvites.invited_by_user_id],
    references: [users.id],
    relationName: "inviter",
  }),
  invitedUser: one(users, {
    fields: [partnerInvites.invited_user_id],
    references: [users.id],
    relationName: "invitee",
  }),
}));

export const groupReferralsRelations = relations(groupReferrals, ({ one }) => ({
  referrerGroup: one(groups, {
    fields: [groupReferrals.referrer_group_id],
    references: [groups.id],
    relationName: "referrerGroup",
  }),
  refereeGroup: one(groups, {
    fields: [groupReferrals.referee_group_id],
    references: [groups.id],
    relationName: "refereeGroup",
  }),
  invitedBy: one(users, {
    fields: [groupReferrals.invited_by_user_id],
    references: [users.id],
  }),
}));
