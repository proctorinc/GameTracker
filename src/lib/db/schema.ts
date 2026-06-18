import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  check,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";

export const invitationTargetTypes = ["user", "phone", "link"] as const;
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
export const gameVersions = ["v1"] as const;
export type GameVersion = (typeof gameVersions)[number];
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
export const userRoles = ["user", "admin"] as const;
export type UserRole = (typeof userRoles)[number];
export const playerRankConfigVersions = ["v1"] as const;
export type PlayerRankConfigVersion =
  (typeof playerRankConfigVersions)[number];

export const users = sqliteTable("users", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId()),
  clerkUserId: text("clerk_user_id").unique(),
  profileCardId: text("profile_card_id"),
  color: text("color").notNull().default("#FFFFFF"),
  role: text("role").$type<UserRole>().notNull().default("user"),
  phoneNumber: text("phone_number", { length: 20 }).unique(),
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
});

export const cardDrops = sqliteTable("card_drops", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gameId: text("game_id").references(() => games.id, { onDelete: "cascade" }),
  cardCount: integer("card_count").notNull().default(1),
  deckName: text("deck_id").references(() => decks.name, {
    onDelete: "cascade",
  }),
});

export const decks = sqliteTable("decks", {
  name: text("name").notNull().primaryKey(),
  description: text("description").notNull().default(""),
});

export const cards = sqliteTable("cards", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // 🌟 Cascades on user deletion
  deckName: text("deck_name")
    .notNull()
    .references(() => decks.name, { onDelete: "cascade" }), // 🌟 Cascades on deck deletion
  value: integer("value").notNull(),
  suit: text("suit").notNull(),
  weight: integer("weight").notNull(),
  modifier: text("modifier").notNull().default("Basic"),
  probability: integer("exact_pull_chance").notNull(),
  suitProbability: integer("generic_pull_chance").notNull(),
  createdAt: text("created_at"),
});

export const friendships = sqliteTable(
  "friendships",
  {
    user1Id: text("user1_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // 🌟 Cascade friendship if user deleted
    user2Id: text("user2_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // 🌟 Cascade friendship if user deleted
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [primaryKey({ columns: [table.user1Id, table.user2Id] })],
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
    inviteePhoneNumber: text("invitee_phone_number", { length: 20 }),
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
      (${table.targetType} = 'user' AND ${table.inviteeUserId} IS NOT NULL AND ${table.inviteePhoneNumber} IS NULL AND ${table.inviteToken} IS NULL) OR
      (${table.targetType} = 'phone' AND ${table.inviteeUserId} IS NULL AND ${table.inviteePhoneNumber} IS NOT NULL AND ${table.inviteToken} IS NULL) OR
      (${table.targetType} = 'link' AND ${table.inviteePhoneNumber} IS NULL AND ${table.inviteToken} IS NOT NULL)
    )`,
    ),
  ],
);

export const gameTitle = sqliteTable("game_title", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title").notNull(),
  normalizedTitle: text("normalized_title").notNull().unique(),
  color: text("color").notNull().default("#475569"),
  imageUrl: text("image_url").notNull().default("/images/skyjo.png"),
  defaultScoringMode: text("default_scoring_mode").$type<GameScoringMode>(),
  defaultEndingMode: text("default_ending_mode").$type<GameEndingMode>(),
  defaultTrackRounds: integer("default_track_rounds", { mode: "boolean" }),
  defaultTargetRounds: integer("default_target_rounds"),
  defaultScoreThreshold: integer("default_score_threshold"),
  defaultScoreThresholdDirection: text(
    "default_score_threshold_direction",
  ).$type<GameScoreThresholdDirection>(),
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
});

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
  (table) => [primaryKey({ columns: [table.userId, table.gameTitleId] })],
);

export const games = sqliteTable("games", {
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
  completedRounds: integer("completed_rounds").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  completedAt: text("completed_at"),
});

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
  (table) => [primaryKey({ columns: [table.gameId, table.userId] })],
);

export const gamePlayers = sqliteTable("game_players", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId()),
  score: integer("score").notNull().default(0),
  isManager: integer("is_manager", { mode: "boolean" })
    .notNull()
    .default(false),
  gameId: text("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const gameRounds = sqliteTable("game_rounds", {
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
});

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
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
    windowMonths: integer("window_months").notNull().default(6),
    defaultMaxPrizePool: integer("default_max_prize_pool").notNull(),
    prizePoolByPlayerCountJson: text("prize_pool_by_player_count_json").notNull(),
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
    check("game_player_rank_results_player_count_positive", sql`${table.playerCount} > 0`),
    check("game_player_rank_results_placement_positive", sql`${table.placement} > 0`),
    check("game_player_rank_results_tie_size_positive", sql`${table.tieSize} > 0`),
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
}));

export const decksRelations = relations(decks, ({ many }) => ({
  cards: many(cards),
  cardDrops: many(cardDrops),
}));

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
  winners: many(gameWinners),
  playerRankResults: many(gamePlayerRankResults),
  cardDrops: many(cardDrops),
}));

export const gameTitleRelations = relations(gameTitle, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [gameTitle.createdByUserId],
    references: [users.id],
  }),
  mergedInto: one(gameTitle, {
    fields: [gameTitle.mergedIntoGameTitleId],
    references: [gameTitle.id],
    relationName: "mergedGameTitle",
  }),
  games: many(games),
  ownedByUsers: many(userGameTitle),
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
  scores: many(gameRoundScores),
}));

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
