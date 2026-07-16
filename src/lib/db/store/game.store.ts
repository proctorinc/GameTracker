import { randomBytes } from "node:crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  notExists,
  or,
} from "drizzle-orm";
import {
  db,
  friendships,
  gameEliminations,
  gameItemizedScoreCategories,
  gameItemizedScoreEntries,
  gamePlayers,
  gameResultPlacements,
  gameRounds,
  gameRoundScores,
  gameTitle,
  gameWinners,
  games,
  userGameTitle,
  userGameTitlePreferences,
  userGameTitleSettings,
  users,
} from "../index";
import type { GameTitleDefaultSettings } from "@/lib/game/title-defaults";
import type { GameSettingsV2 } from "@/lib/game/v2";
import {
  deriveGamePlacementOutcome,
  formatPlacementLabel,
} from "@/lib/game-placement";
import {
  getV2InitialPlayerScore,
  serializeGameSettingsV2,
} from "@/lib/game/v2";
import { buildRecentlyPlayedWithList } from "@/lib/recently-played-with";
import {
  getActivePlayerRankConfig,
  getUserPlayerRankSummary,
  listPlayerRankGameDeltasByGameIds,
} from "./player-rank.store";
import {
  listGuestsCreatedByUser,
  listRecentlyPlayedWithForUser,
} from "./user.store";
import { formatPlayerRankTotal, getPlayerRankWindowStart } from "@/lib/player-rank";
import {
  buildComparisonOptions,
  formatProfileDisplayName,
  type ProfileStatsComparisonOption,
  type ProfileStatsUser,
} from "@/lib/profile-stats";
import { pickRandomProfileColor } from "@/lib/profile-colors";

export type GameBase = typeof games.$inferSelect;
export type GameInsert = typeof games.$inferInsert;
export type GameUpdate = Partial<Omit<GameInsert, "id">>;
export type GamePlayerStartingScoreMode =
  | "none"
  | "average"
  | "highest"
  | "custom";
export type GameTitleBase = typeof gameTitle.$inferSelect;
export type RecentGameTitle = GameTitleBase & {
  timesPlayed: number;
};
export type GameTitleLibraryEntry = GameTitleBase & {
  accessSource:
    | "universal"
    | NonNullable<typeof userGameTitle.$inferSelect.source>;
  acquiredAt: string | null;
  acquiredFromUserId: string | null;
  acquiredFromUserName: string | null;
  isOwned: boolean;
  personalSettingsVersion?: typeof userGameTitleSettings.$inferSelect.settingsVersion | null;
  personalSettingsJson?: string | null;
  personalGameSpecificSettingsJson?: string | null;
  personalDefaultPlayerRole?: typeof userGameTitlePreferences.$inferSelect.defaultPlayerRole | null;
};
export type UnstartedGameByTitle = {
  gameId: string;
  gameTitleId: string;
};
export type PlayedGameTitleSummary = Pick<
  GameTitleBase,
  "id" | "title" | "normalizedTitle" | "color" | "imageUrl"
> & {
  timesPlayed: number;
  topThreeFinishes: number;
  averageScore: number | null;
  playedWith: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
    avatarUrl: string | null;
    isGuest: boolean;
  }>;
};
export type AdminGameTitleEntry = GameTitleBase & {
  creatorName: string | null;
  ownerCount: number;
  gameCount: number;
};
export type AdminGameTitleFilter =
  | "all"
  | "user_custom"
  | "non_universal"
  | "universal"
  | "admin_seed";

export type AdminGameTitlesPage = {
  titles: AdminGameTitleEntry[];
  totalCount: number;
  counts: {
    all: number;
    universal: number;
    nonUniversal: number;
    userCustom: number;
    adminSeed: number;
  };
};
export type GameTitleStatsPageData = {
  title: GameTitleBase;
  currentUserId: string;
  currentUserAvatarUrl: string | null;
  defaultComparisonUserId: string | null;
  comparisonOptions: ProfileStatsComparisonOption[];
  chartSeries: GameTitleRankChartSeries[];
  stats: GameTitleStatsSummary;
  comparisonSummariesByUserId: Record<string, GameTitleComparisonSummary>;
  history: GameTitleHistoryRow[];
};
export type GameTitlePlacementBreakdown = {
  first: number;
  second: number;
  third: number;
};
export type GameTitleRankValue = {
  formatted: string;
  minor: number;
};
export type GameTitleStatsSummary = {
  rankWindowLabel: string | null;
  totalGames: number;
  completedGames: number;
  activeGames: number;
  wins: number;
  winRate: number;
  averageScore: number | null;
  bestScore: number | null;
  lastPlayedAt: string | null;
  totalRounds: number;
  placements: GameTitlePlacementBreakdown;
  rankGainInWindow: GameTitleRankValue;
  rankGainAllTime: GameTitleRankValue;
  bestRankGain: GameTitleRankValue | null;
  averageRankGain: GameTitleRankValue | null;
  currentGlobalRankTotal: string | null;
  currentGlobalRankPosition: number | null;
};
export type GameTitleComparisonSummary = {
  user: ProfileStatsComparisonOption;
  stats: GameTitleStatsSummary;
};
export type GameTitleChartPoint = {
  gameId: string;
  completedAt: string;
  deltaMinor: number;
  deltaFormatted: string;
};
export type GameTitleRankChartSeries = {
  userId: string;
  label: string;
  color: string;
  isCurrentUser: boolean;
  points: GameTitleChartPoint[];
};
export type GameTitleHistoryRowPlayer = {
  userId: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  color: string;
  isGuest: boolean;
  score: number | null;
  placement: number | null;
  placementLabel: string | null;
  won: boolean;
  hasExplicitPodium: boolean;
  rankDelta: GameTitleRankValue | null;
};
export type GameTitleHistoryRow = {
  id: string;
  status: "completed" | "active";
  createdAt: string;
  completedAt: string | null;
  scoringMode: GameBase["scoringMode"];
  completedRounds: number;
  playerCount: number;
  players: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
    avatarUrl: string | null;
  }>;
  currentUser: GameTitleHistoryRowPlayer | null;
  comparisonsByUserId: Record<string, GameTitleHistoryRowPlayer>;
};
export type GameHistoryFilters = {
  status?: "all" | "active" | "completed";
  gameTitleId?: string | null;
  friendUserId?: string | null;
  creator?: "all" | "me";
  outcome?: "all" | "won";
  sort?: "newest" | "oldest";
};
export type FriendActivityFilters = {
  friendUserIds: string[];
  since: string;
};
export type GameWithCreator = GameBase & {
  creator: typeof db._.fullSchema.users.$inferSelect;
};
type PlayedGameTitleSummarySourceGame = Pick<
  GameBase,
  "id" | "createdAt" | "completedAt" | "scoringMode"
> & {
  players: Array<
    Pick<typeof gamePlayers.$inferSelect, "userId" | "score"> & {
      user: Pick<
        typeof users.$inferSelect,
        "id" | "firstName" | "lastName" | "color" | "avatarUrl" | "isGuest"
      >;
    }
  >;
  winners: Array<Pick<typeof gameWinners.$inferSelect, "userId">>;
  resultPlacements: Array<typeof gameResultPlacements.$inferSelect>;
};

type GameTitleLibraryRow = {
  id: string;
  title: string;
  normalizedTitle: string;
  color: string;
  imageUrl: string;
  rewardDeckName: string | null;
  imageVerticalFocus: number;
  customPlayScreenEnabled: boolean;
  defaultScoringMode: GameTitleBase["defaultScoringMode"];
  defaultEndingMode: GameTitleBase["defaultEndingMode"];
  defaultTrackRounds: GameTitleBase["defaultTrackRounds"];
  defaultTargetRounds: GameTitleBase["defaultTargetRounds"];
  defaultScoreThreshold: GameTitleBase["defaultScoreThreshold"];
  defaultScoreThresholdDirection: GameTitleBase["defaultScoreThresholdDirection"];
  defaultSettingsVersion: GameTitleBase["defaultSettingsVersion"];
  defaultSettingsJson: GameTitleBase["defaultSettingsJson"];
  isUniversal: boolean;
  createdByUserId: string | null;
  mergedIntoGameTitleId: string | null;
  createdAt: string;
  ownershipSource: typeof userGameTitle.$inferSelect.source | null;
  acquiredAt: string | null;
  acquiredFromUserId: string | null;
  acquiredFromUserFirstName: string | null;
  acquiredFromUserLastName: string | null;
  personalSettingsVersion: typeof userGameTitleSettings.$inferSelect.settingsVersion | null;
  personalSettingsJson: string | null;
  personalGameSpecificSettingsJson: string | null;
  personalDefaultPlayerRole: typeof userGameTitlePreferences.$inferSelect.defaultPlayerRole | null;
};

export const gameFullRelations = {
  creator: true,
  players: {
    with: {
      user: true,
    },
  },
  winners: {
    with: {
      user: true,
    },
  },
  resultPlacements: true,
  rounds: {
    with: {
      scores: {
        with: {
          user: true,
        },
      },
    },
  },
  eliminations: true,
  cardDrops: true,
  itemizedScoreCategories: true,
  itemizedScoreEntries: true,
  gameTitle: true,
} as const;

export type GameWithPlayers = GameBase & {
  winners: Array<typeof db._.fullSchema.gameWinners.$inferSelect>;
  resultPlacements: Array<typeof db._.fullSchema.gameResultPlacements.$inferSelect>;
  players: Array<
    typeof db._.fullSchema.gamePlayers.$inferSelect & {
      user: typeof db._.fullSchema.users.$inferSelect;
    }
  >;
};
export type GameWithCardDrops = GameBase & {
  cardDrops: Array<typeof db._.fullSchema.cardDrops.$inferSelect>;
};
export type GameFull = GameBase & {
  creator: typeof db._.fullSchema.users.$inferSelect;
  gameTitle: typeof db._.fullSchema.gameTitle.$inferSelect | null;
  winners: Array<
    typeof db._.fullSchema.gameWinners.$inferSelect & {
      user: typeof db._.fullSchema.users.$inferSelect;
    }
  >;
  resultPlacements: Array<typeof db._.fullSchema.gameResultPlacements.$inferSelect>;
  players: Array<
    typeof db._.fullSchema.gamePlayers.$inferSelect & {
      user: typeof db._.fullSchema.users.$inferSelect;
    }
  >;
  rounds: Array<
    typeof db._.fullSchema.gameRounds.$inferSelect & {
      scores: Array<
        typeof db._.fullSchema.gameRoundScores.$inferSelect & {
          user: typeof db._.fullSchema.users.$inferSelect;
        }
      >;
    }
  >;
  eliminations: Array<typeof db._.fullSchema.gameEliminations.$inferSelect>;
  cardDrops: Array<typeof db._.fullSchema.cardDrops.$inferSelect>;
  itemizedScoreCategories: Array<
    typeof db._.fullSchema.gameItemizedScoreCategories.$inferSelect
  >;
  itemizedScoreEntries: Array<
    typeof db._.fullSchema.gameItemizedScoreEntries.$inferSelect
  >;
};
export type GameForPlayPage = GameBase & {
  creator: typeof db._.fullSchema.users.$inferSelect;
  gameTitle: typeof db._.fullSchema.gameTitle.$inferSelect | null;
  winners: Array<
    typeof db._.fullSchema.gameWinners.$inferSelect & {
      user: typeof db._.fullSchema.users.$inferSelect;
    }
  >;
  resultPlacements: Array<typeof db._.fullSchema.gameResultPlacements.$inferSelect>;
  players: Array<
    typeof db._.fullSchema.gamePlayers.$inferSelect & {
      user: typeof db._.fullSchema.users.$inferSelect;
    }
  >;
  rounds: Array<
    typeof db._.fullSchema.gameRounds.$inferSelect & {
      scores: Array<
        typeof db._.fullSchema.gameRoundScores.$inferSelect & {
          user: typeof db._.fullSchema.users.$inferSelect;
        }
      >;
    }
  >;
  eliminations: Array<typeof db._.fullSchema.gameEliminations.$inferSelect>;
  itemizedScoreCategories: Array<
    typeof db._.fullSchema.gameItemizedScoreCategories.$inferSelect
  >;
  itemizedScoreEntries: Array<
    typeof db._.fullSchema.gameItemizedScoreEntries.$inferSelect
  >;
};

function nowIso() {
  return new Date().toISOString();
}

function createShareToken() {
  return randomBytes(24).toString("base64url");
}

function resolveStartingScore(input: {
  mode: GamePlayerStartingScoreMode;
  existingScores: number[];
  scoringMode: typeof games.$inferSelect.scoringMode;
  customValue?: number | null;
}) {
  if (input.mode === "none" || input.existingScores.length === 0) {
    return 0;
  }

  if (input.mode === "custom") {
    if (input.customValue === null || input.customValue === undefined) {
      return 0;
    }

    return Math.trunc(input.customValue);
  }

  if (input.mode === "highest") {
    return input.scoringMode === "highest_wins"
      ? Math.min(...input.existingScores)
      : Math.max(...input.existingScores);
  }

  const total = input.existingScores.reduce((sum, score) => sum + score, 0);
  return Math.round(total / input.existingScores.length);
}

async function grantGameTitleToUserWithExecutor(
  executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    userId: string;
    gameTitleId: string;
    source: typeof userGameTitle.$inferInsert.source;
    sourceGameId?: string | null;
    acquiredFromUserId?: string | null;
  },
) {
  const [ownership] = await executor
    .insert(userGameTitle)
    .values({
      userId: input.userId,
      gameTitleId: input.gameTitleId,
      source: input.source,
      sourceGameId: input.sourceGameId ?? null,
      acquiredFromUserId: input.acquiredFromUserId ?? null,
      acquiredAt: nowIso(),
    })
    .onConflictDoNothing()
    .returning();

  return ownership ?? null;
}

function normalizeGameTitleTitle(title: string) {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

function mapGameTitleLibraryRow(row: GameTitleLibraryRow): GameTitleLibraryEntry {
  return {
    id: row.id,
    title: row.title,
    normalizedTitle: row.normalizedTitle,
    color: row.color,
    imageUrl: row.imageUrl,
    rewardDeckName: row.rewardDeckName,
    imageVerticalFocus: row.imageVerticalFocus,
    customPlayScreenEnabled: row.customPlayScreenEnabled,
    defaultScoringMode: row.defaultScoringMode,
    defaultEndingMode: row.defaultEndingMode,
    defaultTrackRounds: row.defaultTrackRounds,
    defaultTargetRounds: row.defaultTargetRounds,
    defaultScoreThreshold: row.defaultScoreThreshold,
    defaultScoreThresholdDirection: row.defaultScoreThresholdDirection,
    defaultSettingsVersion: row.defaultSettingsVersion,
    defaultSettingsJson: row.defaultSettingsJson,
    isUniversal: row.isUniversal,
    createdByUserId: row.createdByUserId,
    mergedIntoGameTitleId: row.mergedIntoGameTitleId,
    createdAt: row.createdAt,
    accessSource: row.ownershipSource ?? "universal",
    acquiredAt: row.acquiredAt ?? null,
    acquiredFromUserId: row.acquiredFromUserId ?? null,
    acquiredFromUserName:
      [row.acquiredFromUserFirstName, row.acquiredFromUserLastName]
        .filter(Boolean)
        .join(" ")
        .trim() || null,
    isOwned: Boolean(row.ownershipSource),
    personalSettingsVersion: row.personalSettingsVersion,
    personalSettingsJson: row.personalSettingsJson,
    personalGameSpecificSettingsJson: row.personalGameSpecificSettingsJson,
    personalDefaultPlayerRole: row.personalDefaultPlayerRole,
  };
}

function getGamePlacementOutcome(
  game: Pick<
    GameFull,
    | "players"
    | "scoringMode"
    | "completedRounds"
    | "resultPlacements"
    | "winners"
  >,
) {
  return deriveGamePlacementOutcome({
    scoringMode: game.scoringMode,
    participants: game.players.map((player) => ({
      userId: player.userId,
      score: player.score,
    })),
    resultPlacements: game.resultPlacements,
    winnerUserIds: game.winners.map((winner) => winner.userId),
    suppressAllTiedPlacement: game.completedRounds === 0,
  });
}

function createEmptyPlacementBreakdown(): GameTitlePlacementBreakdown {
  return { first: 0, second: 0, third: 0 };
}

function createRankValue(minor: number): GameTitleRankValue {
  return {
    minor,
    formatted: formatPlayerRankTotal(minor),
  };
}

function toHistoryRowPlayer(input: {
  game: GameFull;
  userId: string;
  rankDeltaMinor: number | null;
}): GameTitleHistoryRowPlayer | null {
  const player = input.game.players.find((entry) => entry.userId === input.userId);
  const placementOutcome = getGamePlacementOutcome(input.game);

  if (!player) {
    return null;
  }

  const placement = placementOutcome.placementByUserId[player.userId] ?? null;
  const won = placementOutcome.wonByUserId[player.userId] ?? false;

  return {
    userId: player.userId,
    displayName: formatProfileDisplayName(player.user),
    firstName: player.user.firstName,
    lastName: player.user.lastName,
    color: player.user.color,
    isGuest: player.user.isGuest,
    score: input.game.scoringMode === "no_score" ? null : player.score,
    placement,
    placementLabel: formatPlacementLabel({
      placement,
      won,
      hasExplicitPodium: placementOutcome.hasExplicitPodium,
    }),
    won,
    hasExplicitPodium: placementOutcome.hasExplicitPodium,
    rankDelta:
      input.rankDeltaMinor === null ? null : createRankValue(input.rankDeltaMinor),
  };
}

function buildTitleStatsSummary(input: {
  userId: string;
  games: GameFull[];
  rankDeltaMinorByGameId: Record<string, number>;
  rankWindowStart: string | null;
  rankWindowLabel: string | null;
  currentGlobalRankTotal: string | null;
  currentGlobalRankPosition: number | null;
}): GameTitleStatsSummary {
  const completedGames = input.games.filter((game) => Boolean(game.completedAt));
  const wins = completedGames.filter((game) =>
    game.winners.some((winner) => winner.userId === input.userId),
  ).length;
  const playedScores = completedGames
    .map(
      (game) =>
        game.players.find((player) => player.userId === input.userId)?.score ?? null,
    )
    .filter((score): score is number => score !== null);
  const totalScore = playedScores.reduce((sum, score) => sum + score, 0);
  const placements = createEmptyPlacementBreakdown();
  let rankGainInWindowMinor = 0;
  let rankGainAllTimeMinor = 0;
  let bestRankGainMinor: number | null = null;

  for (const game of completedGames) {
    const placement = getGamePlacementOutcome(game).placementByUserId[input.userId] ?? null;
    if (placement === 1) placements.first += 1;
    if (placement === 2) placements.second += 1;
    if (placement === 3) placements.third += 1;

    const rankDeltaMinor = input.rankDeltaMinorByGameId[game.id] ?? 0;
    rankGainAllTimeMinor += rankDeltaMinor;

    if (
      input.rankWindowStart &&
      game.completedAt &&
      game.completedAt >= input.rankWindowStart
    ) {
      rankGainInWindowMinor += rankDeltaMinor;
    }

    if (bestRankGainMinor === null || rankDeltaMinor > bestRankGainMinor) {
      bestRankGainMinor = rankDeltaMinor;
    }
  }

  return {
    rankWindowLabel: input.rankWindowLabel,
    totalGames: input.games.length,
    completedGames: completedGames.length,
    activeGames: input.games.length - completedGames.length,
    wins,
    winRate: completedGames.length > 0 ? wins / completedGames.length : 0,
    averageScore:
      playedScores.length > 0 ? totalScore / playedScores.length : null,
    bestScore: playedScores.length > 0 ? Math.min(...playedScores) : null,
    lastPlayedAt:
      input.games[0]?.completedAt ?? input.games[0]?.createdAt ?? null,
    totalRounds: input.games.reduce(
      (sum, game) => sum + (game.completedRounds ?? 0),
      0,
    ),
    placements,
    rankGainInWindow: createRankValue(rankGainInWindowMinor),
    rankGainAllTime: createRankValue(rankGainAllTimeMinor),
    bestRankGain:
      bestRankGainMinor === null ? null : createRankValue(bestRankGainMinor),
    averageRankGain:
      completedGames.length > 0
        ? createRankValue(Math.floor(rankGainAllTimeMinor / completedGames.length))
        : null,
    currentGlobalRankTotal: input.currentGlobalRankTotal,
    currentGlobalRankPosition: input.currentGlobalRankPosition,
  };
}

function accessibleGameTitleWhere() {
  return and(
    isNull(gameTitle.mergedIntoGameTitleId),
    or(eq(gameTitle.isUniversal, true), isNotNull(userGameTitle.userId)),
  );
}

function gameTitleLibrarySelect(userId: string) {
  return db
    .select({
      id: gameTitle.id,
      title: gameTitle.title,
      normalizedTitle: gameTitle.normalizedTitle,
      color: gameTitle.color,
      imageUrl: gameTitle.imageUrl,
      rewardDeckName: gameTitle.rewardDeckName,
      imageVerticalFocus: gameTitle.imageVerticalFocus,
      customPlayScreenEnabled: gameTitle.customPlayScreenEnabled,
      defaultScoringMode: gameTitle.defaultScoringMode,
      defaultEndingMode: gameTitle.defaultEndingMode,
      defaultTrackRounds: gameTitle.defaultTrackRounds,
      defaultTargetRounds: gameTitle.defaultTargetRounds,
      defaultScoreThreshold: gameTitle.defaultScoreThreshold,
      defaultScoreThresholdDirection: gameTitle.defaultScoreThresholdDirection,
      defaultSettingsVersion: gameTitle.defaultSettingsVersion,
      defaultSettingsJson: gameTitle.defaultSettingsJson,
      isUniversal: gameTitle.isUniversal,
      createdByUserId: gameTitle.createdByUserId,
      mergedIntoGameTitleId: gameTitle.mergedIntoGameTitleId,
      createdAt: gameTitle.createdAt,
      ownershipSource: userGameTitle.source,
      acquiredAt: userGameTitle.acquiredAt,
      acquiredFromUserId: userGameTitle.acquiredFromUserId,
      acquiredFromUserFirstName: users.firstName,
      acquiredFromUserLastName: users.lastName,
      personalSettingsVersion: userGameTitleSettings.settingsVersion,
      personalSettingsJson: userGameTitleSettings.settingsJson,
      personalGameSpecificSettingsJson:
        userGameTitlePreferences.gameSpecificSettingsJson,
      personalDefaultPlayerRole: userGameTitlePreferences.defaultPlayerRole,
    })
    .from(gameTitle)
    .leftJoin(
      userGameTitle,
      and(
        eq(userGameTitle.gameTitleId, gameTitle.id),
        eq(userGameTitle.userId, userId),
      ),
    )
    .leftJoin(users, eq(users.id, userGameTitle.acquiredFromUserId))
    .leftJoin(
      userGameTitleSettings,
      and(
        eq(userGameTitleSettings.gameTitleId, gameTitle.id),
        eq(userGameTitleSettings.userId, userId),
      ),
    )
    .leftJoin(
      userGameTitlePreferences,
      and(
        eq(userGameTitlePreferences.gameTitleId, gameTitle.id),
        eq(userGameTitlePreferences.userId, userId),
      ),
    );
}

export async function createGame(
  input:
    | string
    | ({
        creatorId: string;
      } & Partial<Omit<GameInsert, "id" | "creatorId">>),
): Promise<GameBase> {
  const values = typeof input === "string" ? { creatorId: input } : input;
  const [game] = await db
    .insert(games)
    .values({
      ...values,
      createdAt: values.createdAt ?? nowIso(),
    })
    .returning();

  return game;
}

export async function getGameById(id: string): Promise<GameWithPlayers | null> {
  const game = await db.query.games.findFirst({
    where: eq(games.id, id),
    with: {
      winners: true,
      resultPlacements: true,
      players: {
        with: {
          user: true,
        },
      },
      rounds: {
        with: {
          scores: {
            with: {
              user: true,
            },
          },
        },
      },
      eliminations: true,
      itemizedScoreCategories: true,
      itemizedScoreEntries: true,
    },
  });

  return game ?? null;
}

async function getGameForPlayPageWhere(where: ReturnType<typeof eq>) {
  const game = await db.query.games.findFirst({
    where,
    with: {
      creator: true,
      gameTitle: true,
      winners: {
        with: {
          user: true,
        },
      },
      resultPlacements: true,
      players: {
        with: {
          user: true,
        },
      },
      rounds: {
        with: {
          scores: {
            with: {
              user: true,
            },
          },
        },
      },
      eliminations: true,
      itemizedScoreCategories: true,
      itemizedScoreEntries: true,
    },
  });

  return game ?? null;
}

export async function getGameForPlayPage(
  id: string,
): Promise<GameForPlayPage | null> {
  return getGameForPlayPageWhere(eq(games.id, id));
}

export async function getGameByShareToken(
  shareToken: string,
): Promise<GameForPlayPage | null> {
  return getGameForPlayPageWhere(eq(games.shareToken, shareToken));
}

export async function getOrCreateGameShareToken(gameId: string): Promise<string> {
  const existingGame = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: {
      id: true,
      shareToken: true,
    },
  });

  if (!existingGame) {
    throw new Error("Game not found");
  }

  if (existingGame.shareToken) {
    return existingGame.shareToken;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const shareToken = createShareToken();
    const existingShare = await db.query.games.findFirst({
      where: eq(games.shareToken, shareToken),
      columns: {
        id: true,
      },
    });

    if (existingShare) {
      continue;
    }

    const [updatedGame] = await db
      .update(games)
      .set({
        shareToken,
      })
      .where(and(eq(games.id, gameId), isNull(games.shareToken)))
      .returning({
        shareToken: games.shareToken,
      });

    if (updatedGame?.shareToken) {
      return updatedGame.shareToken;
    }

    const currentGame = await db.query.games.findFirst({
      where: eq(games.id, gameId),
      columns: {
        shareToken: true,
      },
    });

    if (currentGame?.shareToken) {
      return currentGame.shareToken;
    }
  }

  throw new Error("Unable to generate a unique game share token");
}

export async function getGameFullById(id: string): Promise<GameFull | null> {
  const game = await db.query.games.findFirst({
    where: eq(games.id, id),
    with: gameFullRelations,
  });

  return game ?? null;
}

export async function listGames(): Promise<GameBase[]> {
  return db.query.games.findMany();
}

export async function getGameTitleById(
  id: string,
): Promise<GameTitleBase | null> {
  const record = await db.query.gameTitle.findFirst({
    where: (table, { and, eq, isNull }) =>
      and(eq(table.id, id), isNull(table.mergedIntoGameTitleId)),
  });

  return record ?? null;
}

export async function getGameTitleByNormalizedTitle(
  normalizedTitle: string,
): Promise<GameTitleBase | null> {
  const record = await db.query.gameTitle.findFirst({
    where: (table, { and, eq, isNull }) =>
      and(
        eq(table.normalizedTitle, normalizedTitle),
        isNull(table.mergedIntoGameTitleId),
      ),
  });

  return record ?? null;
}

export async function listGameTitles(
  userId: string,
): Promise<GameTitleLibraryEntry[]> {
  const rows = await gameTitleLibrarySelect(userId)
    .where(accessibleGameTitleWhere())
    .orderBy(asc(gameTitle.title));
  return rows.map(mapGameTitleLibraryRow);
}

export async function getGameTitleLibraryEntryById(input: {
  userId: string;
  gameTitleId: string;
}): Promise<GameTitleLibraryEntry | null> {
  const row = await gameTitleLibrarySelect(input.userId)
    .where(
      and(
        accessibleGameTitleWhere(),
        eq(gameTitle.id, input.gameTitleId),
      ),
    )
    .limit(1);

  return row[0] ? mapGameTitleLibraryRow(row[0]) : null;
}

export async function listSuggestedGameTitles(input: {
  userId: string;
  limit?: number;
}): Promise<GameTitleLibraryEntry[]> {
  const titles = await listGameTitles(input.userId);

  if (titles.length === 0) {
    return [];
  }

  const gamePlayersForUser = await db.query.gamePlayers.findMany({
    where: eq(gamePlayers.userId, input.userId),
    columns: {
      gameId: true,
    },
  });

  const currentUserGameIds = Array.from(
    new Set(gamePlayersForUser.map((player) => player.gameId)),
  );
  const playedGames =
    currentUserGameIds.length === 0
      ? []
      : await db.query.games.findMany({
          where: and(
            inArray(games.id, currentUserGameIds),
            isNotNull(games.gameTitleId),
          ),
          columns: {
            gameTitleId: true,
            createdAt: true,
          },
        });
  const allTitledGames = await db.query.games.findMany({
    where: isNotNull(games.gameTitleId),
    columns: {
      gameTitleId: true,
    },
  });

  const playedStatsByTitleId = new Map<
    string,
    { playCount: number; lastPlayedAt: string }
  >();
  for (const game of playedGames) {
    if (!game.gameTitleId) {
      continue;
    }

    const existing = playedStatsByTitleId.get(game.gameTitleId);
    playedStatsByTitleId.set(game.gameTitleId, {
      playCount: (existing?.playCount ?? 0) + 1,
      lastPlayedAt:
        !existing || game.createdAt > existing.lastPlayedAt
          ? game.createdAt
          : existing.lastPlayedAt,
    });
  }

  const popularCountByTitleId = new Map<string, number>();
  for (const game of allTitledGames) {
    if (!game.gameTitleId) {
      continue;
    }

    popularCountByTitleId.set(
      game.gameTitleId,
      (popularCountByTitleId.get(game.gameTitleId) ?? 0) + 1,
    );
  }

  const sortedTitles = [...titles].sort((left, right) => {
    const leftPlayed = playedStatsByTitleId.get(left.id);
    const rightPlayed = playedStatsByTitleId.get(right.id);

    if (leftPlayed && rightPlayed) {
      if (leftPlayed.lastPlayedAt !== rightPlayed.lastPlayedAt) {
        return rightPlayed.lastPlayedAt.localeCompare(leftPlayed.lastPlayedAt);
      }

      if (leftPlayed.playCount !== rightPlayed.playCount) {
        return rightPlayed.playCount - leftPlayed.playCount;
      }
    } else if (leftPlayed || rightPlayed) {
      return leftPlayed ? -1 : 1;
    }

    if (left.isOwned !== right.isOwned) {
      return left.isOwned ? -1 : 1;
    }

    const leftPopularity = popularCountByTitleId.get(left.id) ?? 0;
    const rightPopularity = popularCountByTitleId.get(right.id) ?? 0;

    if (leftPopularity !== rightPopularity) {
      return rightPopularity - leftPopularity;
    }

    return left.title.localeCompare(right.title);
  });

  const limitedTitles = sortedTitles.slice(0, input.limit ?? 4);

  if (limitedTitles.length <= 1) {
    return limitedTitles;
  }

  const [bestMatch, ...remainingTitles] = limitedTitles;
  return [...remainingTitles, bestMatch];
}

export async function listUnstartedGamesByTitle(
  userId: string,
): Promise<UnstartedGameByTitle[]> {
  const rows = await db
    .select({
      gameId: games.id,
      gameTitleId: games.gameTitleId,
    })
    .from(games)
    .innerJoin(
      gamePlayers,
      and(eq(gamePlayers.gameId, games.id), eq(gamePlayers.userId, userId)),
    )
    .where(
      and(
        isNotNull(games.gameTitleId),
        isNull(games.completedAt),
        eq(games.completedRounds, 0),
        notExists(
          db
            .select({ id: gameRoundScores.id })
            .from(gameRoundScores)
            .innerJoin(
              gameRounds,
              eq(gameRounds.id, gameRoundScores.gameRoundId),
            )
            .where(eq(gameRounds.gameId, games.id)),
        ),
      ),
    )
    .orderBy(desc(games.createdAt));

  const seenTitleIds = new Set<string>();
  const unstartedGames: UnstartedGameByTitle[] = [];

  for (const row of rows) {
    if (!row.gameTitleId || seenTitleIds.has(row.gameTitleId)) {
      continue;
    }

    seenTitleIds.add(row.gameTitleId);
    unstartedGames.push({
      gameId: row.gameId,
      gameTitleId: row.gameTitleId,
    });
  }

  return unstartedGames;
}

function createPlayedGameTitleSummary(input: {
  userId: string;
  title: Pick<
    GameTitleBase,
    "id" | "title" | "normalizedTitle" | "color" | "imageUrl"
  >;
  games: PlayedGameTitleSummarySourceGame[];
}): PlayedGameTitleSummary {
  const completedGames = input.games.filter((game) => Boolean(game.completedAt));
  const playedScores = completedGames
    .map((game) => {
      if (game.scoringMode === "no_score") {
        return null;
      }

      return game.players.find((player) => player.userId === input.userId)?.score ?? null;
    })
    .filter((score): score is number => score !== null);
  const totalScore = playedScores.reduce((sum, score) => sum + score, 0);
  let topThreeFinishes = 0;

  for (const game of completedGames) {
    const placement =
      deriveGamePlacementOutcome({
        scoringMode: game.scoringMode,
        participants: game.players.map((player) => ({
          userId: player.userId,
          score: player.score,
        })),
        resultPlacements: game.resultPlacements,
        winnerUserIds: game.winners.map((winner) => winner.userId),
      }).placementByUserId[input.userId] ?? null;

    if (placement !== null && placement <= 3) {
      topThreeFinishes += 1;
    }
  }

  const playedWithByUserId = new Map<
    string,
    PlayedGameTitleSummary["playedWith"][number] & {
      playCount: number;
    }
  >();

  for (const game of input.games) {
    for (const player of game.players) {
      if (player.userId === input.userId) {
        continue;
      }

      const existing = playedWithByUserId.get(player.userId);
      playedWithByUserId.set(player.userId, {
        id: player.user.id,
        firstName: player.user.firstName,
        lastName: player.user.lastName,
        color: player.user.color,
        avatarUrl: player.user.avatarUrl,
        isGuest: player.user.isGuest,
        playCount: (existing?.playCount ?? 0) + 1,
      });
    }
  }

  const playedWith = [...playedWithByUserId.values()]
    .sort((left, right) => {
      if (right.playCount !== left.playCount) {
        return right.playCount - left.playCount;
      }

      const leftName =
        [left.firstName, left.lastName].filter(Boolean).join(" ") || "User";
      const rightName =
        [right.firstName, right.lastName].filter(Boolean).join(" ") || "User";

      return leftName.localeCompare(rightName);
    })
    .map(({ playCount: _playCount, ...player }) => player);

  return {
    ...input.title,
    timesPlayed: input.games.length,
    topThreeFinishes,
    averageScore:
      playedScores.length > 0 ? totalScore / playedScores.length : null,
    playedWith,
  };
}

export async function listPlayedGameTitleSummaries(
  userId: string,
): Promise<PlayedGameTitleSummary[]> {
  const titles = await db.query.gameTitle.findMany({
    where: (table, { and, eq, exists, isNull }) =>
      and(
        isNull(table.mergedIntoGameTitleId),
        exists(
          db
            .select()
            .from(games)
            .innerJoin(gamePlayers, eq(gamePlayers.gameId, games.id))
            .where(
              and(
                eq(games.gameTitleId, table.id),
                eq(gamePlayers.userId, userId),
              ),
            ),
        ),
      ),
    orderBy: (table, { asc }) => asc(table.title),
    columns: {
      id: true,
      title: true,
      normalizedTitle: true,
      color: true,
      imageUrl: true,
    },
    with: {
      games: {
        where: (table, { eq, exists }) =>
          exists(
            db
              .select()
              .from(gamePlayers)
              .where(
                and(
                  eq(gamePlayers.gameId, table.id),
                  eq(gamePlayers.userId, userId),
                ),
              ),
          ),
        columns: {
          id: true,
          createdAt: true,
          completedAt: true,
          scoringMode: true,
        },
        with: {
          players: {
            columns: {
              userId: true,
              score: true,
            },
            with: {
              user: {
                columns: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  color: true,
                  avatarUrl: true,
                  isGuest: true,
                },
              },
            },
          },
          winners: {
            columns: {
              userId: true,
            },
          },
          resultPlacements: true,
        },
      },
    },
  });

  return titles.map((title) =>
    createPlayedGameTitleSummary({
      userId,
      title,
      games: title.games,
    }),
  );
}

export async function listAllGameTitles(): Promise<GameTitleBase[]> {
  return db.query.gameTitle.findMany({
    where: (table, { isNull }) => isNull(table.mergedIntoGameTitleId),
    orderBy: (table, { asc }) => [asc(table.title)],
  });
}

function getAdminGameTitleWhere(filter: AdminGameTitleFilter) {
  switch (filter) {
    case "user_custom":
      return and(
        isNull(gameTitle.mergedIntoGameTitleId),
        eq(gameTitle.isUniversal, false),
        isNotNull(gameTitle.createdByUserId),
      );
    case "non_universal":
      return and(
        isNull(gameTitle.mergedIntoGameTitleId),
        eq(gameTitle.isUniversal, false),
      );
    case "universal":
      return and(
        isNull(gameTitle.mergedIntoGameTitleId),
        eq(gameTitle.isUniversal, true),
      );
    case "admin_seed":
      return and(
        isNull(gameTitle.mergedIntoGameTitleId),
        eq(gameTitle.isUniversal, true),
        isNull(gameTitle.createdByUserId),
      );
    case "all":
    default:
      return isNull(gameTitle.mergedIntoGameTitleId);
  }
}

async function hydrateAdminGameTitleEntries(
  titles: GameTitleBase[],
): Promise<AdminGameTitleEntry[]> {
  if (titles.length === 0) {
    return [];
  }

  const titleIds = titles.map((title) => title.id);
  const creatorIds = Array.from(
    new Set(
      titles
        .map((title) => title.createdByUserId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [ownerships, titledGames, creators] = await Promise.all([
    db.query.userGameTitle.findMany({
      where: inArray(userGameTitle.gameTitleId, titleIds),
      columns: {
        gameTitleId: true,
      },
    }),
    db.query.games.findMany({
      where: and(isNotNull(games.gameTitleId), inArray(games.gameTitleId, titleIds)),
      columns: {
        gameTitleId: true,
      },
    }),
    creatorIds.length > 0
      ? db.query.users.findMany({
          where: inArray(users.id, creatorIds),
          columns: {
            id: true,
            firstName: true,
            lastName: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const ownerCountByTitleId = new Map<string, number>();
  for (const ownership of ownerships) {
    ownerCountByTitleId.set(
      ownership.gameTitleId,
      (ownerCountByTitleId.get(ownership.gameTitleId) ?? 0) + 1,
    );
  }

  const gameCountByTitleId = new Map<string, number>();
  for (const game of titledGames) {
    if (!game.gameTitleId) {
      continue;
    }

    gameCountByTitleId.set(
      game.gameTitleId,
      (gameCountByTitleId.get(game.gameTitleId) ?? 0) + 1,
    );
  }

  const creatorsById = new Map(
    creators.map((creator) => [
      creator.id,
      [creator.firstName, creator.lastName].filter(Boolean).join(" ").trim() ||
        null,
    ]),
  );

  return titles.map((title) => ({
    ...title,
    creatorName: title.createdByUserId
      ? (creatorsById.get(title.createdByUserId) ?? null)
      : null,
    ownerCount: ownerCountByTitleId.get(title.id) ?? 0,
    gameCount: gameCountByTitleId.get(title.id) ?? 0,
  }));
}

export async function listAdminGameTitlesPage(input?: {
  filter?: AdminGameTitleFilter;
  page?: number;
  pageSize?: number;
}): Promise<AdminGameTitlesPage> {
  const filter = input?.filter ?? "user_custom";
  const page = Math.max(input?.page ?? 1, 1);
  const pageSize = Math.max(input?.pageSize ?? 100, 1);
  const offset = (page - 1) * pageSize;
  const where = getAdminGameTitleWhere(filter);

  const [titleRows, totalRows, allRows, universalRows, nonUniversalRows, userCustomRows, adminSeedRows] =
    await Promise.all([
      db.query.gameTitle.findMany({
        where,
        orderBy: [asc(gameTitle.title)],
        limit: pageSize,
        offset,
      }),
      db.select({ count: count() }).from(gameTitle).where(where),
      db
        .select({ count: count() })
        .from(gameTitle)
        .where(getAdminGameTitleWhere("all")),
      db
        .select({ count: count() })
        .from(gameTitle)
        .where(getAdminGameTitleWhere("universal")),
      db
        .select({ count: count() })
        .from(gameTitle)
        .where(getAdminGameTitleWhere("non_universal")),
      db
        .select({ count: count() })
        .from(gameTitle)
        .where(getAdminGameTitleWhere("user_custom")),
      db
        .select({ count: count() })
        .from(gameTitle)
        .where(getAdminGameTitleWhere("admin_seed")),
    ]);

  return {
    titles: await hydrateAdminGameTitleEntries(titleRows),
    totalCount: totalRows[0]?.count ?? 0,
    counts: {
      all: allRows[0]?.count ?? 0,
      universal: universalRows[0]?.count ?? 0,
      nonUniversal: nonUniversalRows[0]?.count ?? 0,
      userCustom: userCustomRows[0]?.count ?? 0,
      adminSeed: adminSeedRows[0]?.count ?? 0,
    },
  };
}

export async function listAdminGameTitlesByIds(
  ids: string[],
): Promise<AdminGameTitleEntry[]> {
  const titleIds = Array.from(
    new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0)),
  );

  if (titleIds.length === 0) {
    return [];
  }

  const titles = await db.query.gameTitle.findMany({
    where: and(
      isNull(gameTitle.mergedIntoGameTitleId),
      inArray(gameTitle.id, titleIds),
    ),
    orderBy: [asc(gameTitle.title)],
  });

  return hydrateAdminGameTitleEntries(titles);
}

export async function getAccessibleGameTitleById(input: {
  userId: string;
  gameTitleId: string;
  allowAdminAccess?: boolean;
}) {
  const title = await db.query.gameTitle.findFirst({
    where: (table, { and, eq, exists, isNull, or }) => {
      if (input.allowAdminAccess) {
        return and(
          eq(table.id, input.gameTitleId),
          isNull(table.mergedIntoGameTitleId),
        );
      }

      return and(
        eq(table.id, input.gameTitleId),
        isNull(table.mergedIntoGameTitleId),
        or(
          eq(table.isUniversal, true),
          exists(
            db
              .select({ gameTitleId: userGameTitle.gameTitleId })
              .from(userGameTitle)
              .where(
                and(
                  eq(userGameTitle.userId, input.userId),
                  eq(userGameTitle.gameTitleId, table.id),
                ),
              ),
          ),
        ),
      );
    },
  });

  return title ?? null;
}

export async function getGameTitleStatsPageData(input: {
  userId: string;
  gameTitleId: string;
  allowAdminAccess?: boolean;
}): Promise<GameTitleStatsPageData | null> {
  const title = await getAccessibleGameTitleById(input);

  if (!title) {
    return null;
  }

  const [history, friendshipsForUser, guests, recentlyPlayedWithRows, playerRankConfig] =
    await Promise.all([
    db.query.games.findMany({
      where: (table, { and, eq, exists }) =>
        and(
          eq(table.gameTitleId, input.gameTitleId),
          exists(
            db
              .select()
              .from(gamePlayers)
              .where(
                and(
                  eq(gamePlayers.gameId, table.id),
                  eq(gamePlayers.userId, input.userId),
                ),
              ),
          ),
        ),
      orderBy: (table, { desc }) => [
        desc(table.completedAt),
        desc(table.createdAt),
      ],
      with: gameFullRelations,
    }),
    db.query.friendships.findMany({
      where: or(eq(friendships.user1Id, input.userId), eq(friendships.user2Id, input.userId)),
      with: {
        user1: true,
        user2: true,
      },
    }),
    listGuestsCreatedByUser(input.userId),
    listRecentlyPlayedWithForUser({
      userId: input.userId,
      friendUserIds: [],
    }),
    getActivePlayerRankConfig(),
  ]);

  const friendshipUsers = friendshipsForUser.map((friendship) =>
    friendship.user1Id === input.userId ? friendship.user2 : friendship.user1,
  );
  const recentlyPlayedWith = buildRecentlyPlayedWithList({
    createdGuests: guests,
    recentlyPlayedWithRows,
  }).map((entry) => entry.user);
  const comparisonOptions = buildComparisonOptions({
    profileUserId: input.userId,
    friends: friendshipUsers as ProfileStatsUser[],
    guests: guests as ProfileStatsUser[],
    recentlyPlayedWith: recentlyPlayedWith as ProfileStatsUser[],
    includeGuests: true,
  });
  const completedGames = history.filter((game) => Boolean(game.completedAt));
  const allRelevantUserIds = Array.from(
    new Set([
      input.userId,
      ...comparisonOptions.map((option) => option.id),
    ]),
  );
  const playerRankDeltasByGameId = await listPlayerRankGameDeltasByGameIds(
    completedGames.map((game) => game.id),
  );
  const currentUserRankSummary = await getUserPlayerRankSummary(input.userId);
  const rankWindowStart = playerRankConfig
    ? getPlayerRankWindowStart(playerRankConfig.windowMonths)
    : null;
  const rankWindowLabel = playerRankConfig
    ? `${playerRankConfig.windowMonths}-month rank gain`
    : "Window rank gain";
  const rankDeltaMinorByGameIdByUserId = Object.fromEntries(
    allRelevantUserIds.map((userId) => [
      userId,
      Object.fromEntries(
        completedGames.map((game) => [
          game.id,
          playerRankDeltasByGameId[game.id]?.find((delta) => delta.userId === userId)
            ?.deltaMinor ?? 0,
        ]),
      ) as Record<string, number>,
    ]),
  ) as Record<string, Record<string, number>>;

  const stats = buildTitleStatsSummary({
    userId: input.userId,
    games: history,
    rankDeltaMinorByGameId: rankDeltaMinorByGameIdByUserId[input.userId] ?? {},
    rankWindowStart,
    rankWindowLabel,
    currentGlobalRankTotal: currentUserRankSummary?.playerRankTotal ?? null,
    currentGlobalRankPosition: currentUserRankSummary?.playerRankPosition ?? null,
  });
  const comparisonSummariesByUserId = Object.fromEntries(
    comparisonOptions.map((option) => [
      option.id,
      {
        user: option,
        stats: buildTitleStatsSummary({
          userId: option.id,
          games: history.filter((game) =>
            game.players.some((player) => player.userId === option.id),
          ),
          rankDeltaMinorByGameId: rankDeltaMinorByGameIdByUserId[option.id] ?? {},
          rankWindowStart,
          rankWindowLabel,
          currentGlobalRankTotal: null,
          currentGlobalRankPosition: null,
        }),
      } satisfies GameTitleComparisonSummary,
    ]),
  ) as Record<string, GameTitleComparisonSummary>;
  const comparisonGamesByUserId = Object.fromEntries(
    comparisonOptions.map((option) => [
      option.id,
      completedGames.filter((game) =>
        game.players.some((player) => player.userId === option.id),
      ).length,
    ]),
  ) as Record<string, number>;
  const defaultComparisonUserId =
    comparisonOptions
      .sort((left, right) => {
        const gameDiff =
          (comparisonGamesByUserId[right.id] ?? 0) -
          (comparisonGamesByUserId[left.id] ?? 0);
        if (gameDiff !== 0) {
          return gameDiff;
        }
        return left.displayName.localeCompare(right.displayName);
      })[0]?.id ?? null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const chartCutoff = thirtyDaysAgo.toISOString();
  const chartSeries = [
    {
      userId: input.userId,
      label: "You",
      color:
        history.find((game) =>
          game.players.some((player) => player.userId === input.userId),
        )?.players.find((player) => player.userId === input.userId)?.user.color ?? title.color,
      isCurrentUser: true,
      points: completedGames
        .filter((game) => game.completedAt && game.completedAt >= chartCutoff)
        .map((game) => ({
          gameId: game.id,
          completedAt: game.completedAt!,
          deltaMinor:
            playerRankDeltasByGameId[game.id]?.find((delta) => delta.userId === input.userId)
              ?.deltaMinor ?? 0,
          deltaFormatted:
            playerRankDeltasByGameId[game.id]?.find((delta) => delta.userId === input.userId)
              ?.deltaFormatted ?? formatPlayerRankTotal(0),
        })),
    },
    ...comparisonOptions.map((option) => ({
      userId: option.id,
      label: option.displayName,
      color: option.color,
      isCurrentUser: false,
      points: completedGames
        .filter(
          (game) =>
            game.completedAt &&
            game.completedAt >= chartCutoff &&
            game.players.some((player) => player.userId === option.id),
        )
        .map((game) => {
          const delta =
            playerRankDeltasByGameId[game.id]?.find((entry) => entry.userId === option.id) ??
            null;
          return {
            gameId: game.id,
            completedAt: game.completedAt!,
            deltaMinor: delta?.deltaMinor ?? 0,
            deltaFormatted: delta?.deltaFormatted ?? formatPlayerRankTotal(0),
          };
        }),
    })),
  ] satisfies GameTitleRankChartSeries[];
  const historyRows = history.map((game) => ({
    id: game.id,
    status: game.completedAt ? "completed" : "active",
    createdAt: game.createdAt,
    completedAt: game.completedAt,
    scoringMode: game.scoringMode,
    completedRounds: game.completedRounds ?? 0,
    playerCount: game.players.length,
    players: game.players.map((player) => ({
      id: player.user.id,
      firstName: player.user.firstName,
      lastName: player.user.lastName,
      color: player.user.color,
      avatarUrl: player.user.avatarUrl,
    })),
    currentUser: toHistoryRowPlayer({
      game,
      userId: input.userId,
      rankDeltaMinor:
        playerRankDeltasByGameId[game.id]?.find((delta) => delta.userId === input.userId)
          ?.deltaMinor ?? null,
    }),
    comparisonsByUserId: Object.fromEntries(
      comparisonOptions.flatMap((option) => {
        const result = toHistoryRowPlayer({
          game,
          userId: option.id,
          rankDeltaMinor:
            playerRankDeltasByGameId[game.id]?.find((delta) => delta.userId === option.id)
              ?.deltaMinor ?? null,
        });
        return result ? [[option.id, result] as const] : [];
      }),
    ),
  })) satisfies GameTitleHistoryRow[];

  return {
    title,
    currentUserId: input.userId,
    currentUserAvatarUrl:
      history.find((game) => game.players.some((player) => player.userId === input.userId))
        ?.players.find((player) => player.userId === input.userId)?.user.avatarUrl ??
      null,
    defaultComparisonUserId,
    comparisonOptions,
    chartSeries,
    stats,
    comparisonSummariesByUserId,
    history: historyRows,
  };
}

export async function listRecentGameTitles(userId: string) {
  const titles = await db.query.gameTitle.findMany({
    where: (table, { and, eq, exists, isNull }) =>
      and(
        isNull(table.mergedIntoGameTitleId),
        exists(
          db
            .select()
            .from(games)
            .innerJoin(gamePlayers, eq(gamePlayers.gameId, games.id))
            .where(
              and(
                eq(games.gameTitleId, table.id),
                eq(gamePlayers.userId, userId),
              ),
            ),
        ),
      ),
    with: {
      games: {
        columns: { createdAt: true },
        orderBy: (games, { desc }) => desc(games.createdAt),
        limit: 1,
      },
    },
  });

  if (titles.length === 0) {
    return [] satisfies RecentGameTitle[];
  }

  const playCounts = await db
    .select({
      gameTitleId: games.gameTitleId,
      timesPlayed: count(),
    })
    .from(games)
    .innerJoin(
      gamePlayers,
      and(eq(gamePlayers.gameId, games.id), eq(gamePlayers.userId, userId)),
    )
    .where(inArray(games.gameTitleId, titles.map((title) => title.id)))
    .groupBy(games.gameTitleId);
  const playCountByTitleId = new Map(
    playCounts.flatMap((row) =>
      row.gameTitleId ? [[row.gameTitleId, row.timesPlayed] as const] : [],
    ),
  );

  return titles.map(({ games: recentGames, ...title }) => {
    void recentGames;

    return {
      ...title,
      timesPlayed: playCountByTitleId.get(title.id) ?? 0,
    };
  }) satisfies RecentGameTitle[];
}

export async function listRecentCompletedGames(userId: string) {
  return db.query.games.findMany({
    where: (games, { eq, isNotNull, exists }) =>
      and(
        isNotNull(games.completedAt),
        exists(
          db
            .select()
            .from(gamePlayers)
            .where(
              and(
                eq(gamePlayers.gameId, games.id),
                eq(gamePlayers.userId, userId),
              ),
            ),
        ),
      ),
    orderBy: (games, { desc }) => desc(games.createdAt),
    limit: 3,
    with: gameFullRelations,
  });
}

export async function listRecentActiveGames(userId: string) {
  return db.query.games.findMany({
    where: (games, { eq, isNull, exists }) =>
      and(
        isNull(games.completedAt),
        exists(
          db
            .select()
            .from(gamePlayers)
            .where(
              and(
                eq(gamePlayers.gameId, games.id),
                eq(gamePlayers.userId, userId),
              ),
            ),
        ),
      ),
    orderBy: (games, { desc }) => desc(games.createdAt),
    limit: 4,
    with: gameFullRelations,
  });
}

export async function listGameHistoryForUser(
  userId: string,
  filters: GameHistoryFilters = {},
) {
  const status = filters.status ?? "all";
  const creator = filters.creator ?? "all";
  const outcome = filters.outcome ?? "all";
  const sort = filters.sort ?? "newest";
  const gameTitleId = filters.gameTitleId?.trim() || null;
  const friendUserId = filters.friendUserId?.trim() || null;

  return db.query.games.findMany({
    where: (games, { and, eq, exists, isNotNull, isNull }) => {
      const conditions = [
        exists(
          db
            .select()
            .from(gamePlayers)
            .where(
              and(
                eq(gamePlayers.gameId, games.id),
                eq(gamePlayers.userId, userId),
              ),
            ),
        ),
      ];

      if (status === "active") {
        conditions.push(isNull(games.completedAt));
      } else if (status === "completed") {
        conditions.push(isNotNull(games.completedAt));
      }

      if (gameTitleId) {
        conditions.push(eq(games.gameTitleId, gameTitleId));
      }

      if (friendUserId) {
        conditions.push(
          exists(
            db
              .select()
              .from(gamePlayers)
              .where(
                and(
                  eq(gamePlayers.gameId, games.id),
                  eq(gamePlayers.userId, friendUserId),
                ),
              ),
          ),
        );
      }

      if (creator === "me") {
        conditions.push(eq(games.creatorId, userId));
      }

      if (outcome === "won") {
        conditions.push(
          exists(
            db
              .select()
              .from(gameWinners)
              .where(
                and(
                  eq(gameWinners.gameId, games.id),
                  eq(gameWinners.userId, userId),
                ),
              ),
          ),
        );
      }

      return and(...conditions);
    },
    orderBy: (games, { asc, desc }) =>
      sort === "oldest" ? asc(games.createdAt) : desc(games.createdAt),
    with: gameFullRelations,
  });
}

export async function listFriendActivityGames(
  filters: FriendActivityFilters,
): Promise<GameFull[]> {
  if (filters.friendUserIds.length === 0) {
    return [];
  }

  return db.query.games.findMany({
    where: (games, { and, exists, gte, isNotNull, inArray }) =>
      and(
        isNotNull(games.completedAt),
        gte(games.createdAt, filters.since),
        exists(
          db
            .select()
            .from(gamePlayers)
            .where(
              and(
                eq(gamePlayers.gameId, games.id),
                inArray(gamePlayers.userId, filters.friendUserIds),
              ),
            ),
        ),
      ),
    orderBy: (games, { desc }) => [desc(games.createdAt), desc(games.completedAt)],
    limit: 20,
    with: gameFullRelations,
  });
}

export async function getGamesByCreatorId(
  creatorId: string,
): Promise<GameBase[]> {
  return db.query.games.findMany({
    where: eq(games.creatorId, creatorId),
  });
}

export async function updateGame(
  id: string,
  input: GameUpdate,
): Promise<GameBase | null> {
  const [game] = await db
    .update(games)
    .set(input)
    .where(eq(games.id, id))
    .returning();

  return game ?? null;
}

export async function replaceGameWinners(input: {
  gameId: string;
  userIds: string[];
}) {
  await db.delete(gameWinners).where(eq(gameWinners.gameId, input.gameId));

  const uniqueUserIds = Array.from(
    new Set(input.userIds.filter((userId) => userId.trim().length > 0)),
  );

  if (uniqueUserIds.length === 0) {
    return [];
  }

  return db
    .insert(gameWinners)
    .values(
      uniqueUserIds.map((userId) => ({
        gameId: input.gameId,
        userId,
        createdAt: nowIso(),
      })),
    )
    .returning();
}

export async function replaceGameResultPlacements(input: {
  gameId: string;
  placements: Array<{ userId: string; placement: 1 | 2 | 3 }>;
}) {
  await db
    .delete(gameResultPlacements)
    .where(eq(gameResultPlacements.gameId, input.gameId));

  const uniquePlacements = Array.from(
    new Map(
      input.placements
        .filter(
          (placement) =>
            placement.userId.trim().length > 0 &&
            placement.placement >= 1 &&
            placement.placement <= 3,
        )
        .map((placement) => [placement.userId, placement] as const),
    ).values(),
  );

  if (uniquePlacements.length === 0) {
    return [];
  }

  return db
    .insert(gameResultPlacements)
    .values(
      uniquePlacements.map((placement) => ({
        gameId: input.gameId,
        userId: placement.userId,
        placement: placement.placement,
        createdAt: nowIso(),
      })),
    )
    .returning();
}

export async function createGameRound(input: {
  gameId: string;
  roundNumber: number;
}) {
  const [round] = await db
    .insert(gameRounds)
    .values({
      gameId: input.gameId,
      roundNumber: input.roundNumber,
      createdAt: nowIso(),
      completedAt: nowIso(),
    })
    .returning();

  return round ?? null;
}

export async function getGameRoundByGameAndNumber(input: {
  gameId: string;
  roundNumber: number;
}) {
  const round = await db.query.gameRounds.findFirst({
    where: and(
      eq(gameRounds.gameId, input.gameId),
      eq(gameRounds.roundNumber, input.roundNumber),
    ),
    with: {
      scores: {
        with: {
          user: true,
        },
      },
    },
  });

  return round ?? null;
}

export async function updateGameRound(
  id: string,
  input: Partial<Omit<typeof gameRounds.$inferInsert, "id">>,
) {
  const [round] = await db
    .update(gameRounds)
    .set(input)
    .where(eq(gameRounds.id, id))
    .returning();

  return round ?? null;
}

export async function createGameRoundScores(input: {
  gameRoundId: string;
  scores: Array<{ userId: string; scoreDelta: number }>;
}) {
  if (input.scores.length === 0) {
    return [];
  }

  return db
    .insert(gameRoundScores)
    .values(
      input.scores.map((score) => ({
        gameRoundId: input.gameRoundId,
        userId: score.userId,
        scoreDelta: score.scoreDelta,
        createdAt: nowIso(),
      })),
    )
    .returning();
}

export async function getGameRoundScoreByRoundAndUser(input: {
  gameRoundId: string;
  userId: string;
}) {
  const score = await db.query.gameRoundScores.findFirst({
    where: and(
      eq(gameRoundScores.gameRoundId, input.gameRoundId),
      eq(gameRoundScores.userId, input.userId),
    ),
  });

  return score ?? null;
}

export async function updateGameRoundScore(
  id: string,
  input: Partial<Omit<typeof gameRoundScores.$inferInsert, "id">>,
) {
  const [score] = await db
    .update(gameRoundScores)
    .set(input)
    .where(eq(gameRoundScores.id, id))
    .returning();

  return score ?? null;
}

export async function grantGameTitleToUser(input: {
  userId: string;
  gameTitleId: string;
  source: typeof userGameTitle.$inferInsert.source;
  sourceGameId?: string | null;
  acquiredFromUserId?: string | null;
}) {
  return grantGameTitleToUserWithExecutor(db, input);
}

export async function grantGameTitleToUsers(input: {
  userIds: string[];
  gameTitleId: string;
  source: typeof userGameTitle.$inferInsert.source;
  sourceGameId?: string | null;
  acquiredFromUserId?: string | null;
}) {
  const uniqueUserIds = Array.from(
    new Set(input.userIds.filter((userId) => userId.trim().length > 0)),
  );

  if (uniqueUserIds.length === 0) {
    return [];
  }

  return db
    .insert(userGameTitle)
    .values(
      uniqueUserIds.map((userId) => ({
        userId,
        gameTitleId: input.gameTitleId,
        source: input.source,
        sourceGameId: input.sourceGameId ?? null,
        acquiredFromUserId: input.acquiredFromUserId ?? null,
        acquiredAt: nowIso(),
      })),
    )
    .onConflictDoNothing()
    .returning();
}

export async function grantGameTitleToGameParticipants(input: {
  gameId: string;
  gameTitleId: string;
  source: typeof userGameTitle.$inferInsert.source;
  acquiredFromUserId?: string | null;
}) {
  const game = await db.query.games.findFirst({
    where: eq(games.id, input.gameId),
    columns: {
      creatorId: true,
    },
  });

  if (!game) {
    return [];
  }

  const players = await db.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, input.gameId),
    columns: {
      userId: true,
    },
  });

  const userIds = [game.creatorId, ...players.map((player) => player.userId)];

  return grantGameTitleToUsers({
    userIds,
    gameTitleId: input.gameTitleId,
    source: input.source,
    sourceGameId: input.gameId,
    acquiredFromUserId: input.acquiredFromUserId ?? null,
  });
}

export async function createOrFindGameTitle(input: {
  title: string;
  currentUserId: string;
  isUniversal?: boolean;
  defaultSettings?: GameTitleDefaultSettings;
  defaultSettingsV2?: GameSettingsV2 | null;
}) {
  const trimmedTitle = input.title.trim().replace(/\s+/g, " ");

  if (!trimmedTitle) {
    throw new Error("Game title is required");
  }

  const normalizedTitle = normalizeGameTitleTitle(trimmedTitle);
  const existing = await getGameTitleByNormalizedTitle(normalizedTitle);

  if (existing) {
    await grantGameTitleToUser({
      userId: input.currentUserId,
      gameTitleId: existing.id,
      source: "created",
    });

    return existing;
  }

  const [created] = await db
    .insert(gameTitle)
    .values({
      title: trimmedTitle,
      normalizedTitle,
      color: pickRandomProfileColor(),
      imageUrl: "",
      imageVerticalFocus: 50,
      defaultScoringMode: input.defaultSettings?.defaultScoringMode ?? null,
      defaultEndingMode: input.defaultSettings?.defaultEndingMode ?? null,
      defaultTrackRounds: input.defaultSettings?.defaultTrackRounds ?? null,
      defaultTargetRounds: input.defaultSettings?.defaultTargetRounds ?? null,
      defaultScoreThreshold:
        input.defaultSettings?.defaultScoreThreshold ?? null,
      defaultScoreThresholdDirection:
        input.defaultSettings?.defaultScoreThresholdDirection ?? null,
      defaultSettingsVersion: input.defaultSettingsV2?.version ?? null,
      defaultSettingsJson: input.defaultSettingsV2
        ? serializeGameSettingsV2(input.defaultSettingsV2)
        : null,
      isUniversal: input.isUniversal ?? false,
      createdByUserId: input.isUniversal ? null : input.currentUserId,
      createdAt: nowIso(),
    })
    .returning();

  await grantGameTitleToUser({
    userId: input.currentUserId,
    gameTitleId: created.id,
    source: "created",
  });

  return created;
}

export async function shareGameTitleWithUser(input: {
  gameTitleId: string;
  targetUserId: string;
  sharedByUserId: string;
}) {
  return grantGameTitleToUser({
    userId: input.targetUserId,
    gameTitleId: input.gameTitleId,
    source: "shared",
    acquiredFromUserId: input.sharedByUserId,
  });
}

export async function promoteGameTitleToUniversal(gameTitleId: string) {
  const [updatedTitle] = await db
    .update(gameTitle)
    .set({
      isUniversal: true,
    })
    .where(eq(gameTitle.id, gameTitleId))
    .returning();

  return updatedTitle ?? null;
}

export async function updateGameTitleDefaults(
  gameTitleId: string,
  defaults: GameTitleDefaultSettings,
  settingsV2?: GameSettingsV2 | null,
) {
  const [updatedTitle] = await db
    .update(gameTitle)
    .set({
      defaultScoringMode: defaults.defaultScoringMode,
      defaultEndingMode: defaults.defaultEndingMode,
      defaultTrackRounds: defaults.defaultTrackRounds,
      defaultTargetRounds: defaults.defaultTargetRounds,
      defaultScoreThreshold: defaults.defaultScoreThreshold,
      defaultScoreThresholdDirection: defaults.defaultScoreThresholdDirection,
      defaultSettingsVersion: settingsV2?.version ?? null,
      defaultSettingsJson: settingsV2 ? serializeGameSettingsV2(settingsV2) : null,
    })
    .where(eq(gameTitle.id, gameTitleId))
    .returning();

  return updatedTitle ?? null;
}

export async function upsertUserGameTitleSettings(input: {
  userId: string;
  gameTitleId: string;
  settings: GameSettingsV2;
}) {
  const updatedAt = nowIso();
  const [result] = await db
    .insert(userGameTitleSettings)
    .values({
      userId: input.userId,
      gameTitleId: input.gameTitleId,
      settingsVersion: input.settings.version,
      settingsJson: serializeGameSettingsV2(input.settings),
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [
        userGameTitleSettings.userId,
        userGameTitleSettings.gameTitleId,
      ],
      set: {
        settingsVersion: input.settings.version,
        settingsJson: serializeGameSettingsV2(input.settings),
        updatedAt,
      },
    })
    .returning();

  return result;
}

export async function upsertUserGameTitlePreferences(input: {
  userId: string;
  gameTitleId: string;
  gameSpecificSettingsJson: string | null;
  defaultPlayerRole: typeof userGameTitlePreferences.$inferInsert.defaultPlayerRole;
}) {
  const updatedAt = nowIso();
  const [result] = await db
    .insert(userGameTitlePreferences)
    .values({ ...input, updatedAt })
    .onConflictDoUpdate({
      target: [
        userGameTitlePreferences.userId,
        userGameTitlePreferences.gameTitleId,
      ],
      set: {
        gameSpecificSettingsJson: input.gameSpecificSettingsJson,
        defaultPlayerRole: input.defaultPlayerRole,
        updatedAt,
      },
    })
    .returning();

  return result;
}

export async function updateGameTitleImageAndColor(
  gameTitleId: string,
  input: {
    imageUrl: string;
    color: string;
    imageVerticalFocus: number;
  },
) {
  const [updatedTitle] = await db
    .update(gameTitle)
    .set({
      imageUrl: input.imageUrl,
      color: input.color,
      imageVerticalFocus: input.imageVerticalFocus,
    })
    .where(eq(gameTitle.id, gameTitleId))
    .returning();

  return updatedTitle ?? null;
}

export async function listAffectedUserIdsForGameTitle(gameTitleId: string) {
  const [owners, titledGames, players] = await Promise.all([
    db.query.userGameTitle.findMany({
      where: eq(userGameTitle.gameTitleId, gameTitleId),
      columns: {
        userId: true,
      },
    }),
    db.query.games.findMany({
      where: eq(games.gameTitleId, gameTitleId),
      columns: {
        id: true,
        creatorId: true,
      },
    }),
    db
      .select({
        userId: gamePlayers.userId,
      })
      .from(gamePlayers)
      .innerJoin(games, eq(gamePlayers.gameId, games.id))
      .where(eq(games.gameTitleId, gameTitleId)),
  ]);

  return Array.from(
    new Set([
      ...owners.map((owner) => owner.userId),
      ...titledGames.map((game) => game.creatorId),
      ...players.map((player) => player.userId),
    ]),
  );
}

export async function mergeGameTitles(input: {
  sourceGameTitleId: string;
  targetGameTitleId: string;
}) {
  if (input.sourceGameTitleId === input.targetGameTitleId) {
    throw new Error("Choose two different titles to merge");
  }

  const [sourceTitle, targetTitle, sourceOwnerships] = await Promise.all([
    getGameTitleById(input.sourceGameTitleId),
    getGameTitleById(input.targetGameTitleId),
    db.query.userGameTitle.findMany({
      where: eq(userGameTitle.gameTitleId, input.sourceGameTitleId),
    }),
  ]);

  if (!sourceTitle || !targetTitle) {
    throw new Error("Title not found");
  }

  if (sourceTitle.isUniversal && !targetTitle.isUniversal) {
    await db
      .update(gameTitle)
      .set({
        isUniversal: true,
      })
      .where(eq(gameTitle.id, input.targetGameTitleId));
  }

  if (sourceOwnerships.length > 0) {
    await db
      .insert(userGameTitle)
      .values(
        sourceOwnerships.map((ownership) => ({
          userId: ownership.userId,
          gameTitleId: input.targetGameTitleId,
          source: "merged",
          sourceGameId: ownership.sourceGameId,
          acquiredFromUserId: ownership.acquiredFromUserId,
          acquiredAt: ownership.acquiredAt ?? nowIso(),
        })) as Array<typeof userGameTitle.$inferInsert>,
      )
      .onConflictDoNothing();
  }

  await db
    .update(games)
    .set({
      gameTitleId: input.targetGameTitleId,
    })
    .where(eq(games.gameTitleId, input.sourceGameTitleId));

  await db
    .delete(userGameTitle)
    .where(eq(userGameTitle.gameTitleId, input.sourceGameTitleId));

  const [updatedSource] = await db
    .update(gameTitle)
    .set({
      mergedIntoGameTitleId: input.targetGameTitleId,
    })
    .where(eq(gameTitle.id, input.sourceGameTitleId))
    .returning();

  return updatedSource ?? null;
}

export async function deleteGame(id: string): Promise<GameBase | null> {
  const [game] = await db.delete(games).where(eq(games.id, id)).returning();
  return game ?? null;
}

export async function addPlayerToGame(
  gameId: string,
  userId: string,
  input?: {
    isManager?: boolean;
    role?: typeof gamePlayers.$inferInsert.role;
  },
): Promise<typeof gamePlayers.$inferSelect> {
  const [gamePlayer] = await db
    .insert(gamePlayers)
    .values({
      gameId,
      isManager: input?.role === "manager" || (input?.isManager ?? false),
      role: input?.role ?? null,
      userId,
    })
    .returning();

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: {
      gameTitleId: true,
    },
  });

  if (game?.gameTitleId) {
    await grantGameTitleToUser({
      userId,
      gameTitleId: game.gameTitleId,
      source: "played",
      sourceGameId: gameId,
    });
  }

  return gamePlayer;
}

export async function addPlayerToGameWithStartingScore(input: {
  gameId: string;
  userId: string;
  isManager?: boolean;
  role?: typeof gamePlayers.$inferInsert.role;
  startingScoreMode?: GamePlayerStartingScoreMode;
  startingScoreValue?: number | null;
  gameSettingsV2?: GameSettingsV2 | null;
}) {
  return db.transaction(async (tx) => {
    const [game, existingPlayers] = await Promise.all([
      tx.query.games.findFirst({
        where: eq(games.id, input.gameId),
      }),
      tx.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, input.gameId),
        columns: {
          score: true,
        },
      }),
    ]);

    const [gamePlayer] = await tx
      .insert(gamePlayers)
      .values({
        gameId: input.gameId,
        isManager: input.role === "manager" || (input.isManager ?? false),
        role: input.role ?? null,
        userId: input.userId,
      })
      .returning();

    if (!gamePlayer || !game) {
      throw new Error("Could not add game player");
    }

    const startingScore =
      input.gameSettingsV2 !== null && input.gameSettingsV2 !== undefined
        ? getV2InitialPlayerScore(input.gameSettingsV2)
        : resolveStartingScore({
            mode: input.startingScoreMode ?? "none",
            existingScores: existingPlayers.map((player) => player.score),
            scoringMode: game.scoringMode,
            customValue: input.startingScoreValue,
          });

    if (startingScore !== 0) {
      await tx
        .update(gamePlayers)
        .set({
          score: startingScore,
        })
        .where(eq(gamePlayers.id, gamePlayer.id));
    }

    if (game.completedRounds > 0) {
      const previousRound = await tx.query.gameRounds.findFirst({
        where: and(
          eq(gameRounds.gameId, input.gameId),
          eq(gameRounds.roundNumber, game.completedRounds),
        ),
      });

      if (previousRound) {
        await tx.insert(gameRoundScores).values({
          gameRoundId: previousRound.id,
          userId: input.userId,
          scoreDelta: startingScore,
          createdAt: nowIso(),
        });
      }
    }

    if (game.gameTitleId) {
      await grantGameTitleToUserWithExecutor(tx, {
        userId: input.userId,
        gameTitleId: game.gameTitleId,
        source: "played",
        sourceGameId: input.gameId,
      });
    }

    return {
      ...gamePlayer,
      score: startingScore,
    };
  });
}

export async function removePlayerFromGame(input: {
  gameId: string;
  userId: string;
}): Promise<typeof gamePlayers.$inferSelect | null> {
  await db
    .delete(gameRoundScores)
    .where(
      and(
        eq(gameRoundScores.userId, input.userId),
        inArray(
          gameRoundScores.gameRoundId,
          db
            .select({ id: gameRounds.id })
            .from(gameRounds)
            .where(eq(gameRounds.gameId, input.gameId)),
        ),
      ),
    );

  await db
    .delete(gameWinners)
    .where(
      and(
        eq(gameWinners.gameId, input.gameId),
        eq(gameWinners.userId, input.userId),
      ),
    );

  const [gamePlayer] = await db
    .delete(gamePlayers)
    .where(
      and(
        eq(gamePlayers.gameId, input.gameId),
        eq(gamePlayers.userId, input.userId),
      ),
    )
    .returning();

  return gamePlayer ?? null;
}

export async function createGameElimination(input: {
  gameId: string;
  eliminatedUserId: string;
  placement: number;
  roundNumber?: number | null;
}) {
  const [elimination] = await db
    .insert(gameEliminations)
    .values({
      gameId: input.gameId,
      eliminatedUserId: input.eliminatedUserId,
      placement: input.placement,
      roundNumber: input.roundNumber ?? null,
      createdAt: nowIso(),
    })
    .returning();

  return elimination ?? null;
}

export async function listGameEliminations(gameId: string) {
  return db.query.gameEliminations.findMany({
    where: eq(gameEliminations.gameId, gameId),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
}

export async function deleteGameEliminationsByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  return db
    .delete(gameEliminations)
    .where(inArray(gameEliminations.id, ids))
    .returning();
}

export async function deleteGameRoundsByNumbers(input: {
  gameId: string;
  roundNumbers: number[];
}) {
  if (input.roundNumbers.length === 0) {
    return [];
  }

  return db
    .delete(gameRounds)
    .where(
      and(
        eq(gameRounds.gameId, input.gameId),
        inArray(gameRounds.roundNumber, input.roundNumbers),
      ),
    )
    .returning();
}

export async function replaceGameItemizedScoreCategories(input: {
  gameId: string;
  categories: GameSettingsV2["itemizedCategories"];
}) {
  await db
    .delete(gameItemizedScoreEntries)
    .where(eq(gameItemizedScoreEntries.gameId, input.gameId));
  await db
    .delete(gameItemizedScoreCategories)
    .where(eq(gameItemizedScoreCategories.gameId, input.gameId));

  if (input.categories.length === 0) {
    return [];
  }

  return db
    .insert(gameItemizedScoreCategories)
    .values(
      input.categories.map((category) => ({
        id: category.id,
        gameId: input.gameId,
        name: category.name,
        value: 0,
        formula: category.formula,
        inputMode: category.inputMode,
        inputsJson: JSON.stringify(category.inputs),
        helpText: category.helpText,
        sortOrder: category.sortOrder,
        createdAt: nowIso(),
      })),
    )
    .returning();
}

export async function listGameItemizedScoreCategories(gameId: string) {
  return db.query.gameItemizedScoreCategories.findMany({
    where: eq(gameItemizedScoreCategories.gameId, gameId),
    orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.createdAt)],
  });
}

export async function replaceGameItemizedScoreEntries(input: {
  gameId: string;
  gameRoundId?: string | null;
  entries: Array<{
    userId: string;
    categoryId: string;
    values: Record<string, number>;
  }>;
}) {
  await db.delete(gameItemizedScoreEntries).where(
    input.gameRoundId === undefined
      ? eq(gameItemizedScoreEntries.gameId, input.gameId)
      : input.gameRoundId === null
        ? and(
            eq(gameItemizedScoreEntries.gameId, input.gameId),
            isNull(gameItemizedScoreEntries.gameRoundId),
          )
        : and(
            eq(gameItemizedScoreEntries.gameId, input.gameId),
            eq(gameItemizedScoreEntries.gameRoundId, input.gameRoundId),
          ),
  );

  if (input.entries.length === 0) {
    return [];
  }

  return db
    .insert(gameItemizedScoreEntries)
    .values(
      input.entries.map((entry) => ({
        gameId: input.gameId,
        gameRoundId: input.gameRoundId ?? null,
        userId: entry.userId,
        categoryId: entry.categoryId,
        quantity: Math.max(0, Math.trunc(entry.values.count ?? 0)),
        valuesJson: JSON.stringify(entry.values),
        createdAt: nowIso(),
      })),
    )
    .returning();
}

export async function replaceGameItemizedScoreEntriesForPlayer(input: {
  gameId: string;
  gameRoundId: string;
  userId: string;
  entries: Array<{
    categoryId: string;
    values: Record<string, number>;
  }>;
}) {
  await db.delete(gameItemizedScoreEntries).where(
    and(
      eq(gameItemizedScoreEntries.gameId, input.gameId),
      eq(gameItemizedScoreEntries.gameRoundId, input.gameRoundId),
      eq(gameItemizedScoreEntries.userId, input.userId),
    ),
  );

  if (input.entries.length === 0) {
    return [];
  }

  return db
    .insert(gameItemizedScoreEntries)
    .values(
      input.entries.map((entry) => ({
        gameId: input.gameId,
        gameRoundId: input.gameRoundId,
        userId: input.userId,
        categoryId: entry.categoryId,
        quantity: Math.max(0, Math.trunc(entry.values.count ?? 0)),
        valuesJson: JSON.stringify(entry.values),
        createdAt: nowIso(),
      })),
    )
    .returning();
}
