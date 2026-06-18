import { and, eq, gte, isNotNull, isNull } from "drizzle-orm";
import {
  db,
  gamePlayerRankResults,
  games,
  playerRankConfigs,
  users,
} from "../index";
import {
  assignDensePlayerRankPositions,
  computePlayerRankPayouts,
  formatPlayerRankTotal,
  getPlayerRankWindowStart,
  type PlayerRankGameLike,
  type PlayerRankPayout,
} from "@/lib/player-rank";
import type { PlayerRankConfig } from "@/lib/player-rank";
import { logWarn } from "@/lib/server-log";

export type { PlayerRankConfig } from "@/lib/player-rank";

export type PlayerRankConfigRecord = typeof playerRankConfigs.$inferSelect;
export type GamePlayerRankResultRecord = typeof gamePlayerRankResults.$inferSelect;

export type PlayerRankSummary = {
  userId: string;
  playerRankTotal: string;
  playerRankTotalMinor: number;
  playerRankPosition: number;
  playerRankWindowLabel: string;
  playerRankGamesCount: number;
  topThreeFinishes: number;
};

export type PlayerRankStandingRow = PlayerRankSummary & {
  firstName: string | null;
  lastName: string | null;
  displayName: string;
};

export type PlayerRankPreviewRow = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  currentRankTotal: string;
  currentRankTotalMinor: number;
  currentPosition: number;
  previewRankTotal: string;
  previewRankTotalMinor: number;
  previewPosition: number;
  deltaMinor: number;
  eligibleGamesCount: number;
};

export type PublishPlayerRankConfigInput = {
  windowMonths: number;
  defaultMaxPrizePool: number;
  prizePoolByPlayerCount: Record<number, number>;
  smallGameDistribution: Record<number, [number, number, number]>;
  largeGameDistribution: [number, number, number];
};

type UserRow = Pick<
  typeof users.$inferSelect,
  "id" | "firstName" | "lastName"
>;

function formatDisplayName(user: UserRow) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "Skybo Player";
}

function serializeConfig(input: PublishPlayerRankConfigInput) {
  return {
    windowMonths: input.windowMonths,
    defaultMaxPrizePool: input.defaultMaxPrizePool,
    prizePoolByPlayerCountJson: JSON.stringify(input.prizePoolByPlayerCount),
    smallGameDistributionJson: JSON.stringify(input.smallGameDistribution),
    largeGameDistributionJson: JSON.stringify(input.largeGameDistribution),
  };
}

function parseNumberRecord(value: string) {
  const parsed = JSON.parse(value) as Record<string, number>;
  return Object.fromEntries(
    Object.entries(parsed).map(([key, amount]) => [Number(key), amount]),
  ) as Record<number, number>;
}

function parseDistributionRecord(value: string) {
  const parsed = JSON.parse(value) as Record<string, [number, number, number]>;
  return Object.fromEntries(
    Object.entries(parsed).map(([key, shares]) => [Number(key), shares]),
  ) as Record<number, [number, number, number]>;
}

function isMissingPlayerRankSchemaError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("no such table: player_rank_configs") ||
      error.message.includes("no such table: game_player_rank_results") ||
      error.message.includes("player_rank_configs") ||
      error.message.includes("game_player_rank_results"))
  );
}

async function withPlayerRankSchemaFallback<T>(
  operation: () => Promise<T>,
  fallback: () => T,
  operationName: string,
) {
  try {
    return await operation();
  } catch (error) {
    if (!isMissingPlayerRankSchemaError(error)) {
      throw error;
    }

    logWarn("player_rank.schema_missing", {
      operation: operationName,
      message:
        "Player Rank tables are not available yet. Run the latest database migration to enable the feature.",
    });
    return fallback();
  }
}

export function toPlayerRankConfig(record: PlayerRankConfigRecord): PlayerRankConfig {
  return {
    id: record.id,
    windowMonths: record.windowMonths,
    defaultMaxPrizePool: record.defaultMaxPrizePool,
    prizePoolByPlayerCount: parseNumberRecord(record.prizePoolByPlayerCountJson),
    smallGameDistribution: parseDistributionRecord(record.smallGameDistributionJson),
    largeGameDistribution: JSON.parse(record.largeGameDistributionJson) as [
      number,
      number,
      number,
    ],
  };
}

export function validatePlayerRankConfig(input: PublishPlayerRankConfigInput) {
  if (input.windowMonths <= 0) {
    throw new Error("Window months must be greater than 0");
  }

  if (input.defaultMaxPrizePool < 0) {
    throw new Error("Default max prize pool cannot be negative");
  }

  const requiredPrizePools = [2, 3, 4, 5];
  for (const playerCount of requiredPrizePools) {
    const value = input.prizePoolByPlayerCount[playerCount];

    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
      throw new Error(`Prize pool for ${playerCount} players must be 0 or greater`);
    }
  }

  const smallPlayerCounts = [2, 3];
  for (const playerCount of smallPlayerCounts) {
    const shares = input.smallGameDistribution[playerCount];

    if (!shares) {
      throw new Error(`Missing small-game distribution for ${playerCount} players`);
    }

    if (shares.some((value) => value < 0)) {
      throw new Error("Distribution percentages cannot be negative");
    }

    if (playerCount === 2 && shares[2] !== 0) {
      throw new Error("2-player distributions cannot pay 3rd place");
    }

    if (shares.reduce((sum, value) => sum + value, 0) !== 10_000) {
      throw new Error(`Small-game distribution for ${playerCount} players must total 100%`);
    }
  }

  if (input.largeGameDistribution.some((value) => value < 0)) {
    throw new Error("Distribution percentages cannot be negative");
  }

  if (input.largeGameDistribution.reduce((sum, value) => sum + value, 0) !== 10_000) {
    throw new Error("Large-game distribution must total 100%");
  }
}

export async function getActivePlayerRankConfig() {
  const record = await withPlayerRankSchemaFallback(
    () =>
      db.query.playerRankConfigs.findFirst({
        where: eq(playerRankConfigs.isActive, true),
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      }),
    () => null,
    "get_active_config",
  );

  return record ? toPlayerRankConfig(record) : null;
}

export async function listPlayerRankConfigs() {
  const records = await withPlayerRankSchemaFallback(
    () =>
      db.query.playerRankConfigs.findMany({
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      }),
    () => ([] as PlayerRankConfigRecord[]),
    "list_configs",
  );

  return records.map(toPlayerRankConfig);
}

export async function publishPlayerRankConfig(input: {
  actorUserId: string;
  config: PublishPlayerRankConfigInput;
}) {
  validatePlayerRankConfig(input.config);
  const serialized = serializeConfig(input.config);

  return db.transaction(async (tx) => {
    await tx
      .update(playerRankConfigs)
      .set({
        isActive: false,
      })
      .where(eq(playerRankConfigs.isActive, true));

    const [record] = await tx
      .insert(playerRankConfigs)
      .values({
        ...serialized,
        version: "v1",
        isActive: true,
        createdByUserId: input.actorUserId,
        createdAt: new Date().toISOString(),
      })
      .returning();

    if (!record) {
      throw new Error("Unable to publish player rank config");
    }

    return toPlayerRankConfig(record);
  });
}

export async function replaceGamePlayerRankResults(input: {
  gameId: string;
  rankConfigId: string;
  payouts: PlayerRankPayout[];
}) {
  return withPlayerRankSchemaFallback(
    async () => {
      await db
        .delete(gamePlayerRankResults)
        .where(eq(gamePlayerRankResults.gameId, input.gameId));

      if (input.payouts.length === 0) {
        return [];
      }

      return db
        .insert(gamePlayerRankResults)
        .values(
          input.payouts.map((payout) => ({
            gameId: input.gameId,
            userId: payout.userId,
            gameCompletedAt: payout.gameCompletedAt,
            playerCount: payout.playerCount,
            placement: payout.placement,
            tieSize: payout.tieSize,
            rankConfigId: input.rankConfigId,
            prizePoolMinor: payout.prizePoolMinor,
            payoutPercentBps: payout.payoutPercentBps,
            pointsAwardedMinor: payout.pointsAwardedMinor,
            createdAt: new Date().toISOString(),
          })),
        )
        .returning();
    },
    () => ([] as GamePlayerRankResultRecord[]),
    "replace_game_results",
  );
}

export async function deleteGamePlayerRankResults(gameId: string) {
  await withPlayerRankSchemaFallback(
    () =>
      db
        .delete(gamePlayerRankResults)
        .where(eq(gamePlayerRankResults.gameId, gameId)),
    () => undefined,
    "delete_game_results",
  );
}

export async function writePlayerRankResultsForCompletedGame(input: {
  gameId: string;
  game: PlayerRankGameLike;
}) {
  const config = await getActivePlayerRankConfig();

  if (!config) {
    logWarn("player_rank.config_unavailable", {
      operation: "write_completed_game_results",
      gameId: input.gameId,
      message:
        "Skipping Player Rank write because the active config is unavailable. Run the latest database migration to enable the feature.",
    });
    return [];
  }

  const payouts = computePlayerRankPayouts(input.game, config);
  await replaceGamePlayerRankResults({
    gameId: input.gameId,
    rankConfigId: config.id,
    payouts,
  });

  return payouts;
}

async function listCurrentRankUsers() {
  return db.query.users.findMany({
    where: and(eq(users.isGuest, false), isNull(users.mergedIntoUserId)),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });
}

async function listEligibleRankResults(windowStart: string) {
  return withPlayerRankSchemaFallback(
    () =>
      db.query.gamePlayerRankResults.findMany({
        where: gte(gamePlayerRankResults.gameCompletedAt, windowStart),
      }),
    () => ([] as GamePlayerRankResultRecord[]),
    "list_eligible_results",
  );
}

function buildPlayerRankSummaries(input: {
  users: UserRow[];
  results: GamePlayerRankResultRecord[];
  windowMonths: number;
}) {
  const aggregateByUserId = new Map<
    string,
    {
      pointsAwardedMinor: number;
      playerRankGamesCount: number;
      topThreeFinishes: number;
    }
  >();

  for (const user of input.users) {
    aggregateByUserId.set(user.id, {
      pointsAwardedMinor: 0,
      playerRankGamesCount: 0,
      topThreeFinishes: 0,
    });
  }

  for (const result of input.results) {
    const aggregate = aggregateByUserId.get(result.userId);

    if (!aggregate) {
      continue;
    }

    aggregate.pointsAwardedMinor += result.pointsAwardedMinor;
    aggregate.playerRankGamesCount += 1;

    if (result.placement <= 3) {
      aggregate.topThreeFinishes += 1;
    }
  }

  return assignDensePlayerRankPositions(
    input.users.map((user) => ({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: formatDisplayName(user),
      ...(aggregateByUserId.get(user.id) ?? {
        pointsAwardedMinor: 0,
        playerRankGamesCount: 0,
        topThreeFinishes: 0,
      }),
    })),
  ).map((row) => ({
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: row.displayName,
    playerRankTotal: formatPlayerRankTotal(row.pointsAwardedMinor),
    playerRankTotalMinor: row.pointsAwardedMinor,
    playerRankPosition: row.playerRankPosition,
    playerRankWindowLabel: `${input.windowMonths}-month rolling rank`,
    playerRankGamesCount: row.playerRankGamesCount,
    topThreeFinishes: row.topThreeFinishes,
  }));
}

export async function listPlayerRankStandings() {
  const config = await getActivePlayerRankConfig();

  if (!config) {
    return [];
  }

  const windowStart = getPlayerRankWindowStart(config.windowMonths);
  const [rankUsers, results] = await Promise.all([
    listCurrentRankUsers(),
    listEligibleRankResults(windowStart),
  ]);

  return buildPlayerRankSummaries({
    users: rankUsers,
    results,
    windowMonths: config.windowMonths,
  });
}

export async function getUserPlayerRankSummary(userId: string): Promise<PlayerRankSummary | null> {
  const standings = await listPlayerRankStandings();
  const row = standings.find((entry) => entry.userId === userId);

  if (!row) {
    return null;
  }

  return {
    userId: row.userId,
    playerRankTotal: row.playerRankTotal,
    playerRankTotalMinor: row.playerRankTotalMinor,
    playerRankPosition: row.playerRankPosition,
    playerRankWindowLabel: row.playerRankWindowLabel,
    playerRankGamesCount: row.playerRankGamesCount,
    topThreeFinishes: row.topThreeFinishes,
  };
}

async function listCompletedGamesForPreview(windowStart: string) {
  return db.query.games.findMany({
    where: and(isNotNull(games.completedAt), gte(games.completedAt, windowStart)),
    columns: {
      id: true,
      completedAt: true,
      scoringMode: true,
    },
    with: {
      players: {
        columns: {
          userId: true,
          score: true,
        },
      },
      winners: {
        columns: {
          userId: true,
        },
      },
    },
  });
}

export async function previewPlayerRankStandings(
  draftConfig: PublishPlayerRankConfigInput,
): Promise<PlayerRankPreviewRow[]> {
  validatePlayerRankConfig(draftConfig);

  const [rankUsers, activeConfig, completedGames] = await Promise.all([
    listCurrentRankUsers(),
    getActivePlayerRankConfig(),
    listCompletedGamesForPreview(getPlayerRankWindowStart(draftConfig.windowMonths)),
  ]);

  const currentStandings = activeConfig
    ? await listPlayerRankStandings()
    : buildPlayerRankSummaries({
        users: rankUsers,
        results: [],
        windowMonths: draftConfig.windowMonths,
      });

  const previewResults: GamePlayerRankResultRecord[] = completedGames.flatMap((game) => {
    if (!game.completedAt) {
      return [];
    }

    return computePlayerRankPayouts(
      {
        completedAt: game.completedAt,
        scoringMode: game.scoringMode,
        players: game.players.map((player) => ({
          userId: player.userId,
          score: player.score,
        })),
        winnerUserIds: game.winners.map((winner) => winner.userId),
      },
      {
        id: "preview",
        ...draftConfig,
      },
    ).map((payout) => ({
      gameId: game.id,
      userId: payout.userId,
      gameCompletedAt: payout.gameCompletedAt,
      playerCount: payout.playerCount,
      placement: payout.placement,
      tieSize: payout.tieSize,
      rankConfigId: "preview",
      prizePoolMinor: payout.prizePoolMinor,
      payoutPercentBps: payout.payoutPercentBps,
      pointsAwardedMinor: payout.pointsAwardedMinor,
      createdAt: payout.gameCompletedAt,
    }));
  });

  const previewStandings = buildPlayerRankSummaries({
    users: rankUsers,
    results: previewResults,
    windowMonths: draftConfig.windowMonths,
  });

  const currentByUserId = new Map(currentStandings.map((row) => [row.userId, row]));

  return previewStandings.map((row) => {
    const current = currentByUserId.get(row.userId);

    return {
      userId: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName,
      currentRankTotal: current?.playerRankTotal ?? "0",
      currentRankTotalMinor: current?.playerRankTotalMinor ?? 0,
      currentPosition: current?.playerRankPosition ?? row.playerRankPosition,
      previewRankTotal: row.playerRankTotal,
      previewRankTotalMinor: row.playerRankTotalMinor,
      previewPosition: row.playerRankPosition,
      deltaMinor: row.playerRankTotalMinor - (current?.playerRankTotalMinor ?? 0),
      eligibleGamesCount: row.playerRankGamesCount,
    };
  });
}

export async function listGamesMissingPlayerRankResults() {
  return withPlayerRankSchemaFallback(
    () =>
      db
        .select({
          id: games.id,
          completedAt: games.completedAt,
        })
        .from(games)
        .leftJoin(
          gamePlayerRankResults,
          eq(gamePlayerRankResults.gameId, games.id),
        )
        .where(and(isNotNull(games.completedAt), isNull(gamePlayerRankResults.gameId))),
    () => ([] as Array<{ id: string; completedAt: string | null }>),
    "list_games_missing_results",
  );
}

export async function getCompletedGameForPlayerRank(gameId: string) {
  return db.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: {
      id: true,
      completedAt: true,
      scoringMode: true,
    },
    with: {
      players: {
        columns: {
          userId: true,
          score: true,
        },
      },
      winners: {
        columns: {
          userId: true,
        },
      },
    },
  });
}

export async function backfillMissingPlayerRankResults() {
  const gamesMissingResults = await listGamesMissingPlayerRankResults();
  let processedGameCount = 0;

  for (const gameRow of gamesMissingResults) {
    const game = await getCompletedGameForPlayerRank(gameRow.id);

    if (!game?.completedAt) {
      continue;
    }

    await writePlayerRankResultsForCompletedGame({
      gameId: game.id,
      game: {
        completedAt: game.completedAt,
        scoringMode: game.scoringMode,
        players: game.players.map((player) => ({
          userId: player.userId,
          score: player.score,
        })),
        winnerUserIds: game.winners.map((winner) => winner.userId),
      },
    });
    processedGameCount += 1;
  }

  return {
    processedGameCount,
  };
}
