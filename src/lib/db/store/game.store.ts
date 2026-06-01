import { and, asc, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import {
  db,
  gamePlayers,
  gameRounds,
  gameRoundScores,
  gameTitle,
  gameWinners,
  games,
  userGameTitle,
  users,
} from "../index";
import type { GameTitleDefaultSettings } from "@/lib/game/title-defaults";
import { pickRandomProfileColor } from "@/lib/profile-colors";

export type GameBase = typeof games.$inferSelect;
export type GameInsert = typeof games.$inferInsert;
export type GameUpdate = Partial<Omit<GameInsert, "id">>;
export type GameTitleBase = typeof gameTitle.$inferSelect;
export type GameTitleLibraryEntry = GameTitleBase & {
  accessSource:
    | "universal"
    | NonNullable<typeof userGameTitle.$inferSelect.source>;
  acquiredAt: string | null;
  acquiredFromUserId: string | null;
  acquiredFromUserName: string | null;
  isOwned: boolean;
};
export type AdminGameTitleEntry = GameTitleBase & {
  creatorName: string | null;
  ownerCount: number;
  gameCount: number;
};
export type GameTitleStatsPageData = {
  title: GameTitleBase;
  recentHistory: GameFull[];
  stats: {
    totalGames: number;
    completedGames: number;
    activeGames: number;
    wins: number;
    winRate: number;
    averageScore: number | null;
    bestScore: number | null;
    lastPlayedAt: string | null;
    totalRounds: number;
  };
};
export type GameHistoryFilters = {
  status?: "all" | "active" | "completed";
  gameTitleId?: string | null;
  friendUserId?: string | null;
  creator?: "all" | "me";
  outcome?: "all" | "won";
  sort?: "newest" | "oldest";
};
export type GameWithCreator = GameBase & {
  creator: typeof db._.fullSchema.users.$inferSelect;
};

type GameTitleLibraryRow = {
  id: string;
  title: string;
  normalizedTitle: string;
  color: string;
  imageUrl: string;
  defaultScoringMode: GameTitleBase["defaultScoringMode"];
  defaultEndingMode: GameTitleBase["defaultEndingMode"];
  defaultTrackRounds: GameTitleBase["defaultTrackRounds"];
  defaultTargetRounds: GameTitleBase["defaultTargetRounds"];
  defaultScoreThreshold: GameTitleBase["defaultScoreThreshold"];
  defaultScoreThresholdDirection: GameTitleBase["defaultScoreThresholdDirection"];
  isUniversal: boolean;
  createdByUserId: string | null;
  mergedIntoGameTitleId: string | null;
  createdAt: string;
  ownershipSource: typeof userGameTitle.$inferSelect.source | null;
  acquiredAt: string | null;
  acquiredFromUserId: string | null;
  acquiredFromUserFirstName: string | null;
  acquiredFromUserLastName: string | null;
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
  rounds: {
    with: {
      scores: {
        with: {
          user: true,
        },
      },
    },
  },
  cardDrops: true,
  gameTitle: true,
} as const;

export type GameWithPlayers = GameBase & {
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
  cardDrops: Array<typeof db._.fullSchema.cardDrops.$inferSelect>;
};
export type GameForPlayPage = GameBase & {
  creator: typeof db._.fullSchema.users.$inferSelect;
  gameTitle: typeof db._.fullSchema.gameTitle.$inferSelect | null;
  winners: Array<
    typeof db._.fullSchema.gameWinners.$inferSelect & {
      user: typeof db._.fullSchema.users.$inferSelect;
    }
  >;
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
};

function nowIso() {
  return new Date().toISOString();
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
    defaultScoringMode: row.defaultScoringMode,
    defaultEndingMode: row.defaultEndingMode,
    defaultTrackRounds: row.defaultTrackRounds,
    defaultTargetRounds: row.defaultTargetRounds,
    defaultScoreThreshold: row.defaultScoreThreshold,
    defaultScoreThresholdDirection: row.defaultScoreThresholdDirection,
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
      defaultScoringMode: gameTitle.defaultScoringMode,
      defaultEndingMode: gameTitle.defaultEndingMode,
      defaultTrackRounds: gameTitle.defaultTrackRounds,
      defaultTargetRounds: gameTitle.defaultTargetRounds,
      defaultScoreThreshold: gameTitle.defaultScoreThreshold,
      defaultScoreThresholdDirection: gameTitle.defaultScoreThresholdDirection,
      isUniversal: gameTitle.isUniversal,
      createdByUserId: gameTitle.createdByUserId,
      mergedIntoGameTitleId: gameTitle.mergedIntoGameTitleId,
      createdAt: gameTitle.createdAt,
      ownershipSource: userGameTitle.source,
      acquiredAt: userGameTitle.acquiredAt,
      acquiredFromUserId: userGameTitle.acquiredFromUserId,
      acquiredFromUserFirstName: users.firstName,
      acquiredFromUserLastName: users.lastName,
    })
    .from(gameTitle)
    .leftJoin(
      userGameTitle,
      and(
        eq(userGameTitle.gameTitleId, gameTitle.id),
        eq(userGameTitle.userId, userId),
      ),
    )
    .leftJoin(users, eq(users.id, userGameTitle.acquiredFromUserId));
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
    },
  });

  return game ?? null;
}

export async function getGameForPlayPage(
  id: string,
): Promise<GameForPlayPage | null> {
  const game = await db.query.games.findFirst({
    where: eq(games.id, id),
    with: {
      creator: true,
      gameTitle: true,
      winners: {
        with: {
          user: true,
        },
      },
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
    },
  });

  return game ?? null;
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

export async function listAllGameTitles(): Promise<GameTitleBase[]> {
  return db.query.gameTitle.findMany({
    where: (table, { isNull }) => isNull(table.mergedIntoGameTitleId),
    orderBy: (table, { asc }) => [asc(table.title)],
  });
}

export async function listAdminGameTitles(): Promise<AdminGameTitleEntry[]> {
  const titles = await listAllGameTitles();

  const [ownerships, titledGames, creators] = await Promise.all([
    db.query.userGameTitle.findMany({
      columns: {
        gameTitleId: true,
      },
    }),
    db.query.games.findMany({
      where: isNotNull(games.gameTitleId),
      columns: {
        gameTitleId: true,
      },
    }),
    db.query.users.findMany({
      columns: {
        id: true,
        firstName: true,
        lastName: true,
      },
    }),
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

export async function getAccessibleGameTitleById(input: {
  userId: string;
  gameTitleId: string;
}) {
  const title = await db.query.gameTitle.findFirst({
    where: (table, { and, eq, exists, isNull, or }) =>
      and(
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
      ),
  });

  return title ?? null;
}

export async function getGameTitleStatsPageData(input: {
  userId: string;
  gameTitleId: string;
}): Promise<GameTitleStatsPageData | null> {
  const title = await getAccessibleGameTitleById(input);

  if (!title) {
    return null;
  }

  const [history, recentHistory] = await Promise.all([
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
    db.query.games.findMany({
      limit: 3,
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
  ]);

  const completedGames = history.filter((game) => Boolean(game.completedAt));
  const wins = completedGames.filter((game) =>
    game.winners.some((winner) => winner.userId === input.userId),
  ).length;
  const playedScores = completedGames
    .map(
      (game) =>
        game.players.find((player) => player.userId === input.userId)?.score ??
        null,
    )
    .filter((score): score is number => score !== null);
  const totalScore = playedScores.reduce((sum, score) => sum + score, 0);

  return {
    title,
    recentHistory,
    stats: {
      totalGames: history.length,
      completedGames: completedGames.length,
      activeGames: history.length - completedGames.length,
      wins,
      winRate: completedGames.length > 0 ? wins / completedGames.length : 0,
      averageScore:
        playedScores.length > 0 ? totalScore / playedScores.length : null,
      bestScore: playedScores.length > 0 ? Math.min(...playedScores) : null,
      lastPlayedAt: history[0]?.completedAt ?? history[0]?.createdAt ?? null,
      totalRounds: history.reduce(
        (sum, game) => sum + (game.completedRounds ?? 0),
        0,
      ),
    },
  };
}

export async function listRecentGameTitles(userId: string) {
  return db.query.gameTitle.findMany({
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
    limit: 3,
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
  const [ownership] = await db
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
      defaultScoringMode: input.defaultSettings?.defaultScoringMode ?? null,
      defaultEndingMode: input.defaultSettings?.defaultEndingMode ?? null,
      defaultTrackRounds: input.defaultSettings?.defaultTrackRounds ?? null,
      defaultTargetRounds: input.defaultSettings?.defaultTargetRounds ?? null,
      defaultScoreThreshold:
        input.defaultSettings?.defaultScoreThreshold ?? null,
      defaultScoreThresholdDirection:
        input.defaultSettings?.defaultScoreThresholdDirection ?? null,
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
    })
    .where(eq(gameTitle.id, gameTitleId))
    .returning();

  return updatedTitle ?? null;
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
): Promise<typeof gamePlayers.$inferSelect> {
  const [gamePlayer] = await db
    .insert(gamePlayers)
    .values({
      gameId,
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
