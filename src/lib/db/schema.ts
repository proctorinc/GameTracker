import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  check,
  index,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";

export const invitationTargetTypes = ["user", "link"] as const;
export type InvitationTargetType = (typeof invitationTargetTypes)[number];
export const invitationKinds = ["friend", "claim_guest"] as const;
export type InvitationKind = (typeof invitationKinds)[number];
export const invitationStatuses = [
  "pending",
  "accepted",
  "declined",
  "revoked",
  "expired",
] as const;
export type InvitationStatus = (typeof invitationStatuses)[number];
export const gameTitleAcquisitionSources = [
  "admin_seed",
  "created",
  "played",
  "shared",
  "merged",
] as const;
export type GameTitleAcquisitionSource =
  (typeof gameTitleAcquisitionSources)[number];
export const gameVersions = ["v1", "v2"] as const;
export type GameVersion = (typeof gameVersions)[number];
export const gameSettingsVersions = ["v1", "v2"] as const;
export type GameSettingsVersion = (typeof gameSettingsVersions)[number];
export const gamePlayerRoles = ["player", "self_scorer", "manager"] as const;
export type GamePlayerRole = (typeof gamePlayerRoles)[number];
export const gameScoringModes = [
  "highest_wins",
  "lowest_wins",
  "no_score",
] as const;
export type GameScoringMode = (typeof gameScoringModes)[number];
export const gameEndingModes = [
  "none",
  "round_count",
  "score_threshold",
] as const;
export type GameEndingMode = (typeof gameEndingModes)[number];
export const gameScoreThresholdDirections = ["at_least", "at_most"] as const;
export type GameScoreThresholdDirection =
  (typeof gameScoreThresholdDirections)[number];
export const gameJoinRequestStatuses = [
  "pending",
  "approved",
  "declined",
  "cancelled",
] as const;
export type GameJoinRequestStatus = (typeof gameJoinRequestStatuses)[number];
export const userRoles = ["user", "admin"] as const;
export type UserRole = (typeof userRoles)[number];
export const playerRankConfigVersions = ["v1"] as const;
export type PlayerRankConfigVersion = (typeof playerRankConfigVersions)[number];
export const cardRarities = [
  "common",
  "uncommon",
  "rare",
  "legendary",
] as const;
export type CardRarity = (typeof cardRarities)[number];
export const cardRendererTypes = [
  "game_piece",
  "skyjo_number",
  "friend_profile",
  "played_title",
] as const;
export type CardRendererType = (typeof cardRendererTypes)[number];
export const cardSubjectTypes = ["friend", "game_title"] as const;
export type CardSubjectType = (typeof cardSubjectTypes)[number];
export const deckBackStyles = ["geometric", "sunburst", "classic"] as const;
export type DeckBackStyle = (typeof deckBackStyles)[number];

export const featureFlagKeys = ["cards"] as const;
export type FeatureFlagKey = (typeof featureFlagKeys)[number];

export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    clerkUserId: text("clerk_user_id").unique(),
    friendInviteToken: text("friend_invite_token").unique(),
    profileCardId: text("profile_card_id"),
    color: text("color").notNull().default("#FFFFFF"),
    role: text("role").$type<UserRole>().notNull().default("user"),
    email: text("email", { length: 320 }).unique(),
    avatarUrl: text("avatar_url"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    created_by_user_id: text("created_by_user_id"),
    mergedIntoUserId: text("merged_into_user_id").references(
      (): AnySQLiteColumn => users.id,
      {
        onDelete: "set null",
      },
    ),
    mergedAt: text("merged_at"),
    isProfileComplete: integer("is_profile_complete", { mode: "boolean" })
      .notNull()
      .default(false),
    isGuest: integer("is_guest", { mode: "boolean" }).notNull().default(false),
    playerRankLeaderboardDisabled: integer("player_rank_leaderboard_disabled", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    createdAt: text("created_at"),
    updatedAt: text("updated_at"),
  },
  (table) => [
    index("users_merged_into_idx").on(table.mergedIntoUserId),
    index("users_created_by_idx").on(table.created_by_user_id),
  ],
);

export const featureFlags = sqliteTable(
  "feature_flags",
  {
    key: text("key").$type<FeatureFlagKey>().notNull().primaryKey(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    updatedByUserId: text("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [index("feature_flags_updated_by_idx").on(table.updatedByUserId)],
);

export const announcements = sqliteTable(
  "announcements",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    title: text("title").notNull(),
    details: text("details").notNull(),
    screenshotUrl: text("screenshot_url"),
    actionLabel: text("action_label"),
    actionHref: text("action_href"),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    publishedAt: text("published_at"),
    archivedAt: text("archived_at"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("announcements_published_at_idx").on(table.publishedAt),
    index("announcements_created_by_idx").on(table.createdByUserId),
  ],
);

export const announcementAcknowledgments = sqliteTable(
  "announcement_acknowledgments",
  {
    announcementId: text("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    acknowledgedAt: text("acknowledged_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    primaryKey({ columns: [table.announcementId, table.userId] }),
    index("announcement_acknowledgments_user_idx").on(table.userId),
  ],
);

export const cardDrops = sqliteTable(
  "card_drops",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("game_id").references(() => games.id, {
      onDelete: "cascade",
    }),
    cardCount: integer("card_count").notNull().default(1),
    deckName: text("deck_id").references(() => decks.name, {
      onDelete: "cascade",
    }),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    openedAt: text("opened_at"),
  },
  (table) => [
    uniqueIndex("card_drops_user_game_deck_unique").on(
      table.userId,
      table.gameId,
      table.deckName,
    ),
    index("card_drops_game_idx").on(table.gameId),
    index("card_drops_deck_idx").on(table.deckName),
  ],
);

export const decks = sqliteTable("decks", {
  name: text("name").notNull().primaryKey(),
  label: text("label").notNull().default("Deck"),
  description: text("description").notNull().default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  packSize: integer("pack_size").notNull().default(5),
  commonOdds: integer("common_odds").notNull().default(70),
  uncommonOdds: integer("uncommon_odds").notNull().default(20),
  rareOdds: integer("rare_odds").notNull().default(8),
  legendaryOdds: integer("legendary_odds").notNull().default(2),
  backStyle: text("back_style")
    .$type<DeckBackStyle>()
    .notNull()
    .default("geometric"),
  backPrimaryColor: text("back_primary_color").notNull().default("#4f46e5"),
  backSecondaryColor: text("back_secondary_color").notNull().default("#0f172a"),
  backAccentColor: text("back_accent_color").notNull().default("#f8fafc"),
  createdAt: text("created_at")
    .notNull()
    .default("1970-01-01T00:00:00.000Z")
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .default("1970-01-01T00:00:00.000Z")
    .$defaultFn(() => new Date().toISOString()),
});

export const cardTemplates = sqliteTable(
  "card_templates",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    deckName: text("deck_name")
      .notNull()
      .references(() => decks.name, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    rarity: text("rarity").$type<CardRarity>().notNull(),
    renderer: text("renderer").$type<CardRendererType>().notNull(),
    configJson: text("config_json").notNull().default("{}"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    uniqueIndex("card_templates_deck_slug_unique").on(
      table.deckName,
      table.slug,
    ),
    index("card_templates_deck_sort_idx").on(table.deckName, table.sortOrder),
  ],
);

export const cards = sqliteTable(
  "cards",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deckName: text("deck_name")
      .notNull()
      .references(() => decks.name, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    suit: text("suit").notNull(),
    weight: integer("weight").notNull(),
    modifier: text("modifier").notNull().default("Basic"),
    probability: integer("exact_pull_chance").notNull(),
    suitProbability: integer("generic_pull_chance").notNull(),
    cardTemplateId: text("card_template_id").references(
      () => cardTemplates.id,
      { onDelete: "restrict" },
    ),
    rarity: text("rarity").$type<CardRarity>(),
    subjectType: text("subject_type").$type<CardSubjectType>(),
    subjectId: text("subject_id"),
    createdAt: text("created_at"),
  },
  (table) => [
    index("cards_owner_deck_idx").on(table.ownerId, table.deckName),
    index("cards_template_subject_idx").on(
      table.cardTemplateId,
      table.subjectId,
    ),
    index("cards_deck_idx").on(table.deckName),
  ],
);

export const friendships = sqliteTable(
  "friendships",
  {
    user1Id: text("user1_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    user2Id: text("user2_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    primaryKey({ columns: [table.user1Id, table.user2Id] }),
    index("friendships_user2_idx").on(table.user2Id),
    index("friendships_inviter_idx").on(table.inviterId),
  ],
);

export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    inviterUserId: text("inviter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type").$type<InvitationTargetType>().notNull(),
    inviteeUserId: text("invitee_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    inviteToken: text("invite_token").unique(),
    guestUserId: text("guest_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    kind: text("kind").$type<InvitationKind>().notNull().default("friend"),
    status: text("status")
      .$type<InvitationStatus>()
      .notNull()
      .default("pending"),
    acceptedByUserId: text("accepted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedAt: text("accepted_at"),
    expiresAt: text("expires_at"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    check(
      "invitations_target_fields_check",
      sql`(
      (${table.targetType} = 'user' AND ${table.inviteeUserId} IS NOT NULL AND ${table.inviteToken} IS NULL) OR
      (${table.targetType} = 'link' AND ${table.inviteToken} IS NOT NULL)
    )`,
    ),
    index("invitations_inviter_idx").on(table.inviterUserId),
    index("invitations_invitee_idx").on(table.inviteeUserId),
    index("invitations_guest_idx").on(table.guestUserId),
    index("invitations_accepted_by_idx").on(table.acceptedByUserId),
  ],
);

export const gameTitle = sqliteTable(
  "game_title",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull().unique(),
    color: text("color").notNull().default("#475569"),
    imageUrl: text("image_url").notNull().default("/images/skyjo.png"),
    rewardDeckName: text("reward_deck_name").references(() => decks.name, {
      onDelete: "set null",
    }),
    imageVerticalFocus: integer("image_vertical_focus").notNull().default(50),
    customPlayScreenEnabled: integer("custom_play_screen_enabled", {
      mode: "boolean",
    })
      .notNull()
      .default(true),
    defaultScoringMode: text("default_scoring_mode").$type<GameScoringMode>(),
    defaultEndingMode: text("default_ending_mode").$type<GameEndingMode>(),
    defaultTrackRounds: integer("default_track_rounds", { mode: "boolean" }),
    defaultTargetRounds: integer("default_target_rounds"),
    defaultScoreThreshold: integer("default_score_threshold"),
    defaultScoreThresholdDirection: text(
      "default_score_threshold_direction",
    ).$type<GameScoreThresholdDirection>(),
    defaultSettingsVersion: text(
      "default_settings_version",
    ).$type<GameSettingsVersion>(),
    defaultSettingsJson: text("default_settings_json"),
    isUniversal: integer("is_universal", { mode: "boolean" })
      .notNull()
      .default(false),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    mergedIntoGameTitleId: text("merged_into_game_title_id").references(
      (): AnySQLiteColumn => gameTitle.id,
      {
        onDelete: "set null",
      },
    ),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("game_title_reward_deck_idx").on(table.rewardDeckName),
    index("game_title_created_by_idx").on(table.createdByUserId),
    index("game_title_merged_into_idx").on(table.mergedIntoGameTitleId),
  ],
);

export const userGameTitle = sqliteTable(
  "user_game_title",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameTitleId: text("game_title_id")
      .notNull()
      .references(() => gameTitle.id, { onDelete: "cascade" }),
    source: text("source").$type<GameTitleAcquisitionSource>().notNull(),
    sourceGameId: text("source_game_id").references(() => games.id, {
      onDelete: "set null",
    }),
    acquiredFromUserId: text("acquired_from_user_id").references(
      () => users.id,
      {
        onDelete: "set null",
      },
    ),
    acquiredAt: text("acquired_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.gameTitleId] }),
    index("user_game_title_game_title_idx").on(table.gameTitleId),
    index("user_game_title_source_game_idx").on(table.sourceGameId),
    index("user_game_title_acquired_from_idx").on(table.acquiredFromUserId),
  ],
);

export const userGameTitleSettings = sqliteTable(
  "user_game_title_settings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameTitleId: text("game_title_id")
      .notNull()
      .references(() => gameTitle.id, { onDelete: "cascade" }),
    settingsVersion: text("settings_version")
      .$type<GameSettingsVersion>()
      .notNull(),
    settingsJson: text("settings_json").notNull(),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.gameTitleId] }),
    index("user_game_title_settings_game_title_idx").on(table.gameTitleId),
  ],
);

export const userGameTitlePreferences = sqliteTable(
  "user_game_title_preferences",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameTitleId: text("game_title_id")
      .notNull()
      .references(() => gameTitle.id, { onDelete: "cascade" }),
    gameSpecificSettingsJson: text("game_specific_settings_json"),
    defaultPlayerRole: text("default_player_role")
      .$type<GamePlayerRole>()
      .notNull()
      .default("player"),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.gameTitleId] }),
    index("user_game_title_prefs_game_title_idx").on(table.gameTitleId),
  ],
);

export const games = sqliteTable(
  "games",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    gameTitleId: text("game_title_id").references(() => gameTitle.id, {
      onDelete: "cascade",
    }),
    version: text("version").$type<GameVersion>().notNull().default("v1"),
    creatorId: text("creator_id")
      .notNull()
      .references(() => users.id),
    scoringMode: text("scoring_mode")
      .$type<GameScoringMode>()
      .notNull()
      .default("lowest_wins"),
    endingMode: text("ending_mode")
      .$type<GameEndingMode>()
      .notNull()
      .default("none"),
    trackRounds: integer("track_rounds", { mode: "boolean" })
      .notNull()
      .default(false),
    targetRounds: integer("target_rounds"),
    scoreThreshold: integer("score_threshold"),
    scoreThresholdDirection: text(
      "score_threshold_direction",
    ).$type<GameScoreThresholdDirection>(),
    settingsJson: text("settings_json"),
    gameSpecificSettingsJson: text("game_specific_settings_json"),
    defaultPlayerRole: text("default_player_role").$type<GamePlayerRole>(),
    customPlayStateJson: text("custom_play_state_json"),
    shareToken: text("share_token").unique(),
    inviteUsersEnabled: integer("invite_users_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    completedRounds: integer("completed_rounds").notNull().default(0),
    pausedAt: text("paused_at"),
    pausedNextUserId: text("paused_next_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("games_game_title_idx").on(table.gameTitleId),
    index("games_creator_idx").on(table.creatorId),
    index("games_paused_next_user_idx").on(table.pausedNextUserId),
  ],
);

export const gameWinners = sqliteTable(
  "game_winners",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    primaryKey({ columns: [table.gameId, table.userId] }),
    index("game_winners_user_idx").on(table.userId),
  ],
);

export const gameResultPlacements = sqliteTable(
  "game_result_placements",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    placement: integer("placement").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    primaryKey({ columns: [table.gameId, table.userId] }),
    check(
      "game_result_placements_placement_range",
      sql`${table.placement} >= 1 AND ${table.placement} <= 3`,
    ),
    index("game_result_placements_user_idx").on(table.userId),
  ],
);

export const gamePlayers = sqliteTable(
  "game_players",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    score: integer("score").notNull().default(0),
    isManager: integer("is_manager", { mode: "boolean" })
      .notNull()
      .default(false),
    role: text("role").$type<GamePlayerRole>(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("game_players_game_idx").on(table.gameId),
    index("game_players_user_idx").on(table.userId),
  ],
);

export const gameRounds = sqliteTable(
  "game_rounds",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    roundNumber: integer("round_number").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    completedAt: text("completed_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [index("game_rounds_game_idx").on(table.gameId)],
);

export const gameEliminations = sqliteTable(
  "game_eliminations",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    eliminatedUserId: text("eliminated_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    placement: integer("placement").notNull(),
    roundNumber: integer("round_number"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    check("game_eliminations_placement_positive", sql`${table.placement} > 0`),
    index("game_eliminations_game_idx").on(table.gameId),
    index("game_eliminations_user_idx").on(table.eliminatedUserId),
  ],
);

export const gameRoundScores = sqliteTable(
  "game_round_scores",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    gameRoundId: text("game_round_id")
      .notNull()
      .references(() => gameRounds.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scoreDelta: integer("score_delta").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    check("game_round_score_non_null", sql`${table.scoreDelta} IS NOT NULL`),
    index("game_round_scores_game_round_idx").on(table.gameRoundId),
    index("game_round_scores_user_idx").on(table.userId),
  ],
);

export const gameItemizedScoreCategories = sqliteTable(
  "game_itemized_score_categories",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    value: integer("value").notNull(),
    formula: text("formula"),
    inputMode: text("input_mode"),
    inputsJson: text("inputs_json"),
    helpText: text("help_text"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("game_itemized_score_categories_game_idx").on(table.gameId),
  ],
);

export const gameItemizedScoreEntries = sqliteTable(
  "game_itemized_score_entries",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    gameRoundId: text("game_round_id").references(() => gameRounds.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => gameItemizedScoreCategories.id, {
        onDelete: "cascade",
      }),
    quantity: integer("quantity").notNull().default(0),
    valuesJson: text("values_json"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    check(
      "game_itemized_score_entries_quantity_non_negative",
      sql`${table.quantity} >= 0`,
    ),
    index("game_itemized_score_entries_game_idx").on(table.gameId),
    index("game_itemized_score_entries_round_idx").on(table.gameRoundId),
    index("game_itemized_score_entries_user_idx").on(table.userId),
    index("game_itemized_score_entries_category_idx").on(table.categoryId),
  ],
);

export const gameJoinRequests = sqliteTable(
  "game_join_requests",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    requesterUserId: text("requester_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<GameJoinRequestStatus>()
      .notNull()
      .default("pending"),
    requestedAt: text("requested_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    resolvedAt: text("resolved_at"),
    resolvedByUserId: text("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("game_join_requests_game_status_idx").on(table.gameId, table.status),
    index("game_join_requests_requester_status_idx").on(
      table.requesterUserId,
      table.status,
    ),
    index("game_join_requests_resolved_by_idx").on(table.resolvedByUserId),
  ],
);

export const playerRankConfigs = sqliteTable(
  "player_rank_configs",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    version: text("version")
      .$type<PlayerRankConfigVersion>()
      .notNull()
      .default("v1"),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(false),
    windowMonths: integer("window_months").notNull().default(6),
    defaultMaxPrizePool: integer("default_max_prize_pool").notNull(),
    prizePoolByPlayerCountJson: text(
      "prize_pool_by_player_count_json",
    ).notNull(),
    smallGameDistributionJson: text("small_game_distribution_json").notNull(),
    largeGameDistributionJson: text("large_game_distribution_json").notNull(),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    check(
      "player_rank_configs_window_months_positive",
      sql`${table.windowMonths} > 0`,
    ),
    check(
      "player_rank_configs_default_max_prize_pool_non_negative",
      sql`${table.defaultMaxPrizePool} >= 0`,
    ),
    index("player_rank_configs_created_by_idx").on(table.createdByUserId),
  ],
);

export const gamePlayerRankResults = sqliteTable(
  "game_player_rank_results",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameCompletedAt: text("game_completed_at").notNull(),
    playerCount: integer("player_count").notNull(),
    placement: integer("placement").notNull(),
    tieSize: integer("tie_size").notNull(),
    rankConfigId: text("rank_config_id")
      .notNull()
      .references(() => playerRankConfigs.id, { onDelete: "restrict" }),
    prizePoolMinor: integer("prize_pool_minor").notNull(),
    payoutPercentBps: integer("payout_percent_bps").notNull(),
    pointsAwardedMinor: integer("points_awarded_minor").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    primaryKey({ columns: [table.gameId, table.userId] }),
    check(
      "game_player_rank_results_player_count_positive",
      sql`${table.playerCount} > 0`,
    ),
    check(
      "game_player_rank_results_placement_positive",
      sql`${table.placement} > 0`,
    ),
    check(
      "game_player_rank_results_tie_size_positive",
      sql`${table.tieSize} > 0`,
    ),
    check(
      "game_player_rank_results_prize_pool_minor_non_negative",
      sql`${table.prizePoolMinor} >= 0`,
    ),
    check(
      "game_player_rank_results_payout_percent_bps_non_negative",
      sql`${table.payoutPercentBps} >= 0`,
    ),
    check(
      "game_player_rank_results_points_awarded_minor_non_negative",
      sql`${table.pointsAwardedMinor} >= 0`,
    ),
    index("game_player_rank_results_user_idx").on(table.userId),
    index("game_player_rank_results_rank_config_idx").on(table.rankConfigId),
  ],
);

export const playerRankHistory = sqliteTable(
  "player_rank_history",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    historyDate: text("history_date").notNull(),
    playerRankPosition: integer("player_rank_position"),
    playerRankTotalMinor: integer("player_rank_total_minor").notNull(),
    playerRankGamesCount: integer("player_rank_games_count").notNull(),
    topThreeFinishes: integer("top_three_finishes").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.historyDate] }),
    index("player_rank_history_history_date_idx").on(table.historyDate),
    index("player_rank_history_user_history_date_idx").on(
      table.userId,
      table.historyDate,
    ),
    check(
      "player_rank_history_total_minor_non_negative",
      sql`${table.playerRankTotalMinor} >= 0`,
    ),
    check(
      "player_rank_history_games_count_non_negative",
      sql`${table.playerRankGamesCount} >= 0`,
    ),
    check(
      "player_rank_history_top_three_non_negative",
      sql`${table.topThreeFinishes} >= 0`,
    ),
    check(
      "player_rank_history_position_positive",
      sql`${table.playerRankPosition} IS NULL OR ${table.playerRankPosition} > 0`,
    ),
  ],
);

export const cardsRelations = relations(cards, ({ one }) => ({
  owner: one(users, {
    fields: [cards.ownerId],
    references: [users.id],
    relationName: "cardOwner",
  }),
  deck: one(decks, {
    fields: [cards.deckName],
    references: [decks.name],
  }),
  template: one(cardTemplates, {
    fields: [cards.cardTemplateId],
    references: [cardTemplates.id],
  }),
}));

export const announcementsRelations = relations(
  announcements,
  ({ one, many }) => ({
    createdBy: one(users, {
      fields: [announcements.createdByUserId],
      references: [users.id],
    }),
    acknowledgments: many(announcementAcknowledgments),
  }),
);

export const announcementAcknowledgmentsRelations = relations(
  announcementAcknowledgments,
  ({ one }) => ({
    announcement: one(announcements, {
      fields: [announcementAcknowledgments.announcementId],
      references: [announcements.id],
    }),
    user: one(users, {
      fields: [announcementAcknowledgments.userId],
      references: [users.id],
    }),
  }),
);

export const decksRelations = relations(decks, ({ many }) => ({
  cards: many(cards),
  templates: many(cardTemplates),
  cardDrops: many(cardDrops),
  rewardGameTitles: many(gameTitle),
}));

export const cardTemplatesRelations = relations(
  cardTemplates,
  ({ one, many }) => ({
    deck: one(decks, {
      fields: [cardTemplates.deckName],
      references: [decks.name],
    }),
    cards: many(cards),
  }),
);

export const cardDropsRelations = relations(cardDrops, ({ one }) => ({
  user: one(users, { fields: [cardDrops.userId], references: [users.id] }),
  game: one(games, { fields: [cardDrops.gameId], references: [games.id] }),
  deck: one(decks, { fields: [cardDrops.deckName], references: [decks.name] }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user1: one(users, {
    fields: [friendships.user1Id],
    references: [users.id],
    relationName: "user1",
  }),
  user2: one(users, {
    fields: [friendships.user2Id],
    references: [users.id],
    relationName: "user2",
  }),
  inviter: one(users, {
    fields: [friendships.inviterId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  inviter: one(users, {
    fields: [invitations.inviterUserId],
    references: [users.id],
    relationName: "inviter",
  }),
  invitee: one(users, {
    fields: [invitations.inviteeUserId],
    references: [users.id],
    relationName: "invitee",
  }),
  guestUser: one(users, {
    fields: [invitations.guestUserId],
    references: [users.id],
    relationName: "guestUser",
  }),
  acceptedBy: one(users, {
    fields: [invitations.acceptedByUserId],
    references: [users.id],
    relationName: "acceptedBy",
  }),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  creator: one(users, {
    fields: [games.creatorId],
    references: [users.id],
    relationName: "gameCreator",
  }),
  gameTitle: one(gameTitle, {
    fields: [games.gameTitleId],
    references: [gameTitle.id],
  }),
  players: many(gamePlayers),
  rounds: many(gameRounds),
  eliminations: many(gameEliminations),
  winners: many(gameWinners),
  resultPlacements: many(gameResultPlacements),
  itemizedScoreCategories: many(gameItemizedScoreCategories),
  itemizedScoreEntries: many(gameItemizedScoreEntries),
  playerRankResults: many(gamePlayerRankResults),
  cardDrops: many(cardDrops),
  joinRequests: many(gameJoinRequests),
}));

export const gameTitleRelations = relations(gameTitle, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [gameTitle.createdByUserId],
    references: [users.id],
  }),
  rewardDeck: one(decks, {
    fields: [gameTitle.rewardDeckName],
    references: [decks.name],
  }),
  mergedInto: one(gameTitle, {
    fields: [gameTitle.mergedIntoGameTitleId],
    references: [gameTitle.id],
    relationName: "mergedGameTitle",
  }),
  games: many(games),
  ownedByUsers: many(userGameTitle),
  userSettings: many(userGameTitleSettings),
  userPreferences: many(userGameTitlePreferences),
}));

export const userGameTitleRelations = relations(userGameTitle, ({ one }) => ({
  user: one(users, {
    fields: [userGameTitle.userId],
    references: [users.id],
  }),
  gameTitle: one(gameTitle, {
    fields: [userGameTitle.gameTitleId],
    references: [gameTitle.id],
  }),
  sourceGame: one(games, {
    fields: [userGameTitle.sourceGameId],
    references: [games.id],
  }),
  acquiredFromUser: one(users, {
    fields: [userGameTitle.acquiredFromUserId],
    references: [users.id],
    relationName: "acquiredFromUser",
  }),
}));

export const userGameTitleSettingsRelations = relations(
  userGameTitleSettings,
  ({ one }) => ({
    user: one(users, {
      fields: [userGameTitleSettings.userId],
      references: [users.id],
    }),
    gameTitle: one(gameTitle, {
      fields: [userGameTitleSettings.gameTitleId],
      references: [gameTitle.id],
    }),
  }),
);

export const userGameTitlePreferencesRelations = relations(
  userGameTitlePreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userGameTitlePreferences.userId],
      references: [users.id],
    }),
    gameTitle: one(gameTitle, {
      fields: [userGameTitlePreferences.gameTitleId],
      references: [gameTitle.id],
    }),
  }),
);

export const gamePlayersRelations = relations(gamePlayers, ({ one }) => ({
  game: one(games, {
    fields: [gamePlayers.gameId],
    references: [games.id],
  }),
  user: one(users, {
    fields: [gamePlayers.userId],
    references: [users.id],
  }),
}));

export const gameRoundsRelations = relations(gameRounds, ({ one, many }) => ({
  game: one(games, {
    fields: [gameRounds.gameId],
    references: [games.id],
  }),
  itemizedScoreEntries: many(gameItemizedScoreEntries),
  scores: many(gameRoundScores),
}));

export const gameEliminationsRelations = relations(
  gameEliminations,
  ({ one }) => ({
    game: one(games, {
      fields: [gameEliminations.gameId],
      references: [games.id],
    }),
    eliminatedUser: one(users, {
      fields: [gameEliminations.eliminatedUserId],
      references: [users.id],
    }),
  }),
);

export const gameRoundScoresRelations = relations(
  gameRoundScores,
  ({ one }) => ({
    round: one(gameRounds, {
      fields: [gameRoundScores.gameRoundId],
      references: [gameRounds.id],
    }),
    user: one(users, {
      fields: [gameRoundScores.userId],
      references: [users.id],
    }),
  }),
);

export const gameItemizedScoreCategoriesRelations = relations(
  gameItemizedScoreCategories,
  ({ one, many }) => ({
    game: one(games, {
      fields: [gameItemizedScoreCategories.gameId],
      references: [games.id],
    }),
    entries: many(gameItemizedScoreEntries),
  }),
);

export const gameItemizedScoreEntriesRelations = relations(
  gameItemizedScoreEntries,
  ({ one }) => ({
    game: one(games, {
      fields: [gameItemizedScoreEntries.gameId],
      references: [games.id],
    }),
    round: one(gameRounds, {
      fields: [gameItemizedScoreEntries.gameRoundId],
      references: [gameRounds.id],
    }),
    user: one(users, {
      fields: [gameItemizedScoreEntries.userId],
      references: [users.id],
    }),
    category: one(gameItemizedScoreCategories, {
      fields: [gameItemizedScoreEntries.categoryId],
      references: [gameItemizedScoreCategories.id],
    }),
  }),
);

export const gameJoinRequestsRelations = relations(
  gameJoinRequests,
  ({ one }) => ({
    game: one(games, {
      fields: [gameJoinRequests.gameId],
      references: [games.id],
    }),
    requester: one(users, {
      fields: [gameJoinRequests.requesterUserId],
      references: [users.id],
      relationName: "gameJoinRequester",
    }),
    resolvedBy: one(users, {
      fields: [gameJoinRequests.resolvedByUserId],
      references: [users.id],
      relationName: "gameJoinResolvedBy",
    }),
  }),
);

export const gameWinnersRelations = relations(gameWinners, ({ one }) => ({
  game: one(games, {
    fields: [gameWinners.gameId],
    references: [games.id],
  }),
  user: one(users, {
    fields: [gameWinners.userId],
    references: [users.id],
    relationName: "gameWinner",
  }),
}));

export const gameResultPlacementsRelations = relations(
  gameResultPlacements,
  ({ one }) => ({
    game: one(games, {
      fields: [gameResultPlacements.gameId],
      references: [games.id],
    }),
    user: one(users, {
      fields: [gameResultPlacements.userId],
      references: [users.id],
    }),
  }),
);

export const playerRankConfigsRelations = relations(
  playerRankConfigs,
  ({ many, one }) => ({
    createdBy: one(users, {
      fields: [playerRankConfigs.createdByUserId],
      references: [users.id],
    }),
    gameRankResults: many(gamePlayerRankResults),
  }),
);

export const gamePlayerRankResultsRelations = relations(
  gamePlayerRankResults,
  ({ one }) => ({
    game: one(games, {
      fields: [gamePlayerRankResults.gameId],
      references: [games.id],
    }),
    user: one(users, {
      fields: [gamePlayerRankResults.userId],
      references: [users.id],
    }),
    rankConfig: one(playerRankConfigs, {
      fields: [gamePlayerRankResults.rankConfigId],
      references: [playerRankConfigs.id],
    }),
  }),
);

export const playerRankHistoryRelations = relations(
  playerRankHistory,
  ({ one }) => ({
    user: one(users, {
      fields: [playerRankHistory.userId],
      references: [users.id],
    }),
  }),
);
