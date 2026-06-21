import { and, eq, gte, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import {
  db,
  gamePlayerRankResults,
  games,
  playerRankConfigs,
  playerRankHistory,
  users,
} from "../index";
import {
  assignDensePlayerRankPositions,
  computePlayerRankPayouts,
  formatPlayerRankTotal,
  formatSignedPlayerRankDelta,
  getPlayerRankWindowStart,
  type PlayerRankGameLike,
  type PlayerRankPayout,
} from "@/lib/player-rank";
import type { PlayerRankConfig } from "@/lib/player-rank";
import { logWarn } from "@/lib/server-log";

export type { PlayerRankConfig } from "@/lib/player-rank";

export type PlayerRankConfigRecord = typeof playerRankConfigs.$inferSelect;
export type GamePlayerRankResultRecord = typeof gamePlayerRankResults.$inferSelect;
export type PlayerRankHistoryRecord = typeof playerRankHistory.$inferSelect;

export type PlayerRankSummary = {
  userId: string;
  playerRankTotal: string;
  playerRankTotalMinor: number;
  playerRankPosition: number | null;
  playerRankWindowLabel: string;
  playerRankGamesCount: number;
  topThreeFinishes: number;
  isLeaderboardDisabled: boolean;
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
  isLeaderboardDisabled: boolean;
  currentRankTotal: string;
  currentRankTotalMinor: number;
  currentPosition: number | null;
  previewRankTotal: string;
  previewRankTotalMinor: number;
  previewPosition: number | null;
  deltaMinor: number;
  eligibleGamesCount: number;
};

export type PlayerRankGameDelta = {
  gameId: string;
  userId: string;
  deltaMinor: number;
  deltaFormatted: string;
  completedAt: string;
};

export type PlayerRankWindowDelta = {
  deltaMinor: number;
  deltaFormatted: string;
  startTotal: string;
  startTotalMinor: number;
  endTotal: string;
  endTotalMinor: number;
};

export type PlayerRankRecentChangeSummary = {
  recentWindowLabel: string;
  startRankTotal: string;
  startRankTotalMinor: number;
  currentRankTotal: string;
  currentRankTotalMinor: number;
  netChange: PlayerRankWindowDelta | null;
  recentIncrease: PlayerRankWindowDelta | null;
  recentDecrease: PlayerRankWindowDelta | null;
};

export type PlayerRankHistorySnapshot = {
  userId: string;
  historyDate: string;
  playerRankPosition: number | null;
  playerRankTotal: string;
  playerRankTotalMinor: number;
  playerRankGamesCount: number;
  topThreeFinishes: number;
};

export type PlayerRankChartPoint = {
  historyDate: string;
  hasSnapshot: boolean;
  playerRankPosition: number | null;
  playerRankTotal: string | null;
  playerRankTotalMinor: number | null;
  playerRankGamesCount: number | null;
  topThreeFinishes: number | null;
};

export type PlayerRankHistorySeries = {
  startDate: string;
  endDate: string;
  historyDateKeys: string[];
  pointsByUserId: Record<string, PlayerRankChartPoint[]>;
};

export type PublishPlayerRankConfigInput = {
  windowMonths: number;
  defaultMaxPrizePool: number;
  prizePoolByPlayerCount: Record<number, number>;
  smallGameDistribution: Record<number, [number, number, number]>;
  largeGameDistribution: [number, number, number];
};

export type PlayerRankHealthStatus = "good" | "review" | "error";

export type PlayerRankHealthCheck = {
  status: PlayerRankHealthStatus;
  label: string;
  message: string;
  affectedGameCount: number;
  totalCheckedGameCount: number;
  affectedGameIds: string[];
};

type UserRow = Pick<
  typeof users.$inferSelect,
  "id" | "firstName" | "lastName" | "playerRankLeaderboardDisabled" | "createdAt"
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

function buildPlayerRankGameDelta(
  row: Pick<
    GamePlayerRankResultRecord,
    "gameId" | "userId" | "pointsAwardedMinor" | "gameCompletedAt"
  >,
): PlayerRankGameDelta {
  return {
    gameId: row.gameId,
    userId: row.userId,
    deltaMinor: row.pointsAwardedMinor,
    deltaFormatted: formatSignedPlayerRankDelta(row.pointsAwardedMinor),
    completedAt: row.gameCompletedAt,
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
      error.message.includes("no such table: player_rank_history") ||
      error.message.includes("player_rank_configs") ||
      error.message.includes("game_player_rank_results") ||
      error.message.includes("player_rank_history"))
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

function toHistoryDateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function getHistoryDayStartIso(historyDate: string) {
  return `${historyDate}T00:00:00.000Z`;
}

function getHistoryDayEndIso(historyDate: string) {
  return `${historyDate}T23:59:59.999Z`;
}

function addHistoryDays(historyDate: string, days: number) {
  const value = new Date(getHistoryDayStartIso(historyDate));
  value.setUTCDate(value.getUTCDate() + days);
  return toHistoryDateKey(value);
}

function listHistoryDateKeys(startDate: string, endDate: string) {
  const keys: string[] = [];

  for (
    let cursor = startDate;
    cursor <= endDate;
    cursor = addHistoryDays(cursor, 1)
  ) {
    keys.push(cursor);
  }

  return keys;
}

function buildHistorySnapshot(input: {
  historyDate: string;
  row: PlayerRankStandingRow;
}): PlayerRankHistorySnapshot {
  return {
    userId: input.row.userId,
    historyDate: input.historyDate,
    playerRankPosition: input.row.playerRankPosition,
    playerRankTotal: input.row.playerRankTotal,
    playerRankTotalMinor: input.row.playerRankTotalMinor,
    playerRankGamesCount: input.row.playerRankGamesCount,
    topThreeFinishes: input.row.topThreeFinishes,
  };
}

function areHistorySnapshotsEqual(
  left: PlayerRankHistorySnapshot | null | undefined,
  right: PlayerRankHistorySnapshot | null | undefined,
) {
  if (!left || !right) {
    return false;
  }

  return (
    left.playerRankPosition === right.playerRankPosition &&
    left.playerRankTotalMinor === right.playerRankTotalMinor &&
    left.playerRankGamesCount === right.playerRankGamesCount &&
    left.topThreeFinishes === right.topThreeFinishes
  );
}

function createEmptyChartPoint(historyDate: string): PlayerRankChartPoint {
  return {
    historyDate,
    hasSnapshot: false,
    playerRankPosition: null,
    playerRankTotal: null,
    playerRankTotalMinor: null,
    playerRankGamesCount: null,
    topThreeFinishes: null,
  };
}

function toHistorySnapshot(record: PlayerRankHistoryRecord): PlayerRankHistorySnapshot {
  return {
    userId: record.userId,
    historyDate: record.historyDate,
    playerRankPosition: record.playerRankPosition,
    playerRankTotal: formatPlayerRankTotal(record.playerRankTotalMinor),
    playerRankTotalMinor: record.playerRankTotalMinor,
    playerRankGamesCount: record.playerRankGamesCount,
    topThreeFinishes: record.topThreeFinishes,
  };
}

function buildPlayerRankWindowDelta(input: {
  startTotalMinor: number;
  endTotalMinor: number;
}): PlayerRankWindowDelta {
  return {
    deltaMinor: input.endTotalMinor - input.startTotalMinor,
    deltaFormatted: formatSignedPlayerRankDelta(
      input.endTotalMinor - input.startTotalMinor,
    ),
    startTotal: formatPlayerRankTotal(input.startTotalMinor),
    startTotalMinor: input.startTotalMinor,
    endTotal: formatPlayerRankTotal(input.endTotalMinor),
    endTotalMinor: input.endTotalMinor,
  };
}

export function buildDensePlayerRankChartPoints(input: {
  historyDateKeys: string[];
  snapshots: PlayerRankHistorySnapshot[];
}) {
  const snapshots = [...input.snapshots].sort((left, right) =>
    left.historyDate.localeCompare(right.historyDate),
  );
  const points: PlayerRankChartPoint[] = [];
  let snapshotIndex = 0;
  let currentSnapshot: PlayerRankHistorySnapshot | null = null;

  for (const historyDate of input.historyDateKeys) {
    while (
      snapshots[snapshotIndex] &&
      snapshots[snapshotIndex]!.historyDate <= historyDate
    ) {
      currentSnapshot = snapshots[snapshotIndex] ?? null;
      snapshotIndex += 1;
    }

    if (!currentSnapshot) {
      points.push(createEmptyChartPoint(historyDate));
      continue;
    }

    points.push({
      historyDate,
      hasSnapshot: true,
      playerRankPosition: currentSnapshot.playerRankPosition,
      playerRankTotal: currentSnapshot.playerRankTotal,
      playerRankTotalMinor: currentSnapshot.playerRankTotalMinor,
      playerRankGamesCount: currentSnapshot.playerRankGamesCount,
      topThreeFinishes: currentSnapshot.topThreeFinishes,
    });
  }

  return points;
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
      playerRankLeaderboardDisabled: true,
      createdAt: true,
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

  const rows = input.users.map((user) => ({
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: formatDisplayName(user),
    isLeaderboardDisabled: user.playerRankLeaderboardDisabled,
    ...(aggregateByUserId.get(user.id) ?? {
      pointsAwardedMinor: 0,
      playerRankGamesCount: 0,
      topThreeFinishes: 0,
    }),
  }));
  const rankedRows = assignDensePlayerRankPositions(
    rows.filter((row) => !row.isLeaderboardDisabled),
  );
  const rankByUserId = new Map(
    rankedRows.map((row) => [row.userId, row.playerRankPosition] as const),
  );

  return rows
    .map((row) => ({
      userId: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName,
      isLeaderboardDisabled: row.isLeaderboardDisabled,
      playerRankTotal: formatPlayerRankTotal(row.pointsAwardedMinor),
      playerRankTotalMinor: row.pointsAwardedMinor,
      playerRankPosition: row.isLeaderboardDisabled
        ? null
        : (rankByUserId.get(row.userId) ?? null),
      playerRankWindowLabel: `${input.windowMonths}-month rolling rank`,
      playerRankGamesCount: row.playerRankGamesCount,
      topThreeFinishes: row.topThreeFinishes,
    }))
    .sort((left, right) => {
      if (left.isLeaderboardDisabled !== right.isLeaderboardDisabled) {
        return left.isLeaderboardDisabled ? 1 : -1;
      }

      if (left.playerRankPosition !== null && right.playerRankPosition !== null) {
        if (left.playerRankPosition !== right.playerRankPosition) {
          return left.playerRankPosition - right.playerRankPosition;
        }
      } else if (left.playerRankPosition !== right.playerRankPosition) {
        return left.playerRankPosition === null ? 1 : -1;
      }

      if (right.playerRankTotalMinor !== left.playerRankTotalMinor) {
        return right.playerRankTotalMinor - left.playerRankTotalMinor;
      }

      if (right.topThreeFinishes !== left.topThreeFinishes) {
        return right.topThreeFinishes - left.topThreeFinishes;
      }

      if (right.playerRankGamesCount !== left.playerRankGamesCount) {
        return right.playerRankGamesCount - left.playerRankGamesCount;
      }

      return left.displayName.localeCompare(right.displayName);
    });
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

export async function listVisiblePlayerRankStandings() {
  const standings = await listPlayerRankStandings();
  return standings.filter((row) => !row.isLeaderboardDisabled);
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
    isLeaderboardDisabled: row.isLeaderboardDisabled,
  };
}

async function listPlayerRankHistoryRowsForUsers(input: {
  userIds: string[];
  endDate: string;
}) {
  const userIds = Array.from(
    new Set(input.userIds.filter((userId) => userId.trim().length > 0)),
  );

  if (userIds.length === 0) {
    return [];
  }

  return withPlayerRankSchemaFallback(
    () =>
      db.query.playerRankHistory.findMany({
        where: and(
          inArray(playerRankHistory.userId, userIds),
          lte(playerRankHistory.historyDate, input.endDate),
        ),
        orderBy: (table, { asc }) => [asc(table.userId), asc(table.historyDate)],
      }),
    () => ([] as PlayerRankHistoryRecord[]),
    "list_history_rows_for_users",
  );
}

export async function listPlayerRankHistorySeries(input: {
  userIds: string[];
  days?: number;
  now?: Date;
}): Promise<PlayerRankHistorySeries> {
  const days = Math.max(1, input.days ?? 30);
  const endDate = toHistoryDateKey(input.now ?? new Date());
  const startDate = addHistoryDays(endDate, -(days - 1));
  const historyDateKeys = listHistoryDateKeys(startDate, endDate);
  const uniqueUserIds = Array.from(
    new Set(input.userIds.filter((userId) => userId.trim().length > 0)),
  );
  const rows = await listPlayerRankHistoryRowsForUsers({
    userIds: uniqueUserIds,
    endDate,
  });
  const snapshotsByUserId = new Map<string, PlayerRankHistorySnapshot[]>();

  for (const row of rows) {
    const snapshots = snapshotsByUserId.get(row.userId) ?? [];
    snapshots.push(toHistorySnapshot(row));
    snapshotsByUserId.set(row.userId, snapshots);
  }

  return {
    startDate,
    endDate,
    historyDateKeys,
    pointsByUserId: Object.fromEntries(
      uniqueUserIds.map((userId) => [
        userId,
        buildDensePlayerRankChartPoints({
          historyDateKeys,
          snapshots: snapshotsByUserId.get(userId) ?? [],
        }),
      ]),
    ),
  };
}

async function deletePlayerRankHistoryOnOrAfter(historyDate: string) {
  await withPlayerRankSchemaFallback(
    () =>
      db
        .delete(playerRankHistory)
        .where(gte(playerRankHistory.historyDate, historyDate)),
    () => undefined,
    "delete_history_on_or_after",
  );
}

async function deleteAllPlayerRankHistory() {
  await withPlayerRankSchemaFallback(
    () => db.delete(playerRankHistory),
    () => undefined,
    "delete_all_history",
  );
}

async function listHistoryEligibleRankResults(input: {
  startDate: string;
  endDate: string;
  windowMonths: number;
}) {
  const firstWindowStart = getPlayerRankWindowStart(
    input.windowMonths,
    new Date(getHistoryDayEndIso(input.startDate)),
  );

  return withPlayerRankSchemaFallback(
    () =>
      db.query.gamePlayerRankResults.findMany({
        where: and(
          gte(gamePlayerRankResults.gameCompletedAt, firstWindowStart),
          lte(gamePlayerRankResults.gameCompletedAt, getHistoryDayEndIso(input.endDate)),
        ),
        orderBy: (table, { asc }) => [asc(table.gameCompletedAt), asc(table.gameId)],
      }),
    () => ([] as GamePlayerRankResultRecord[]),
    "list_history_eligible_results",
  );
}

export async function rebuildPlayerRankHistoryFromDate(input: {
  startDate: string;
  now?: Date;
}) {
  const config = await getActivePlayerRankConfig();
  const startDate = toHistoryDateKey(input.startDate);
  const endDate = toHistoryDateKey(input.now ?? new Date());

  if (startDate > endDate) {
    return {
      startDate,
      endDate,
      rebuiltDayCount: 0,
      writtenSnapshotCount: 0,
    };
  }

  if (!config) {
    await deletePlayerRankHistoryOnOrAfter(startDate);

    return {
      startDate,
      endDate,
      rebuiltDayCount: 0,
      writtenSnapshotCount: 0,
    };
  }

  const [rankUsers, results] = await Promise.all([
    listCurrentRankUsers(),
    listHistoryEligibleRankResults({
      startDate,
      endDate,
      windowMonths: config.windowMonths,
    }),
  ]);

  const snapshotsToWrite: PlayerRankHistorySnapshot[] = [];
  const previousSnapshotByUserId = new Map<string, PlayerRankHistorySnapshot | null>();
  const historyDateKeys = listHistoryDateKeys(startDate, endDate);

  for (const historyDate of historyDateKeys) {
    const activeUsers = rankUsers.filter((user) => {
      if (!user.createdAt) {
        return true;
      }

      return toHistoryDateKey(user.createdAt) <= historyDate;
    });

    if (activeUsers.length === 0) {
      previousSnapshotByUserId.clear();
      continue;
    }

    const windowStart = getPlayerRankWindowStart(
      config.windowMonths,
      new Date(getHistoryDayEndIso(historyDate)),
    );
    const dayEnd = getHistoryDayEndIso(historyDate);
    const eligibleResults = results.filter(
      (result) =>
        result.gameCompletedAt >= windowStart && result.gameCompletedAt <= dayEnd,
    );

    if (eligibleResults.length === 0) {
      previousSnapshotByUserId.clear();
      continue;
    }

    const summaries = buildPlayerRankSummaries({
      users: activeUsers,
      results: eligibleResults,
      windowMonths: config.windowMonths,
    });

    for (const row of summaries) {
      const snapshot = buildHistorySnapshot({
        historyDate,
        row,
      });
      const previousSnapshot = previousSnapshotByUserId.get(row.userId);

      if (!areHistorySnapshotsEqual(previousSnapshot, snapshot)) {
        snapshotsToWrite.push(snapshot);
      }

      previousSnapshotByUserId.set(row.userId, snapshot);
    }
  }

  await deletePlayerRankHistoryOnOrAfter(startDate);

  if (snapshotsToWrite.length > 0) {
    const nowIso = new Date().toISOString();
    await withPlayerRankSchemaFallback(
      () =>
        db.insert(playerRankHistory).values(
          snapshotsToWrite.map((snapshot) => ({
            userId: snapshot.userId,
            historyDate: snapshot.historyDate,
            playerRankPosition: snapshot.playerRankPosition,
            playerRankTotalMinor: snapshot.playerRankTotalMinor,
            playerRankGamesCount: snapshot.playerRankGamesCount,
            topThreeFinishes: snapshot.topThreeFinishes,
            createdAt: nowIso,
            updatedAt: nowIso,
          })),
        ),
      () => undefined,
      "insert_history_snapshots",
    );
  }

  return {
    startDate,
    endDate,
    rebuiltDayCount: historyDateKeys.length,
    writtenSnapshotCount: snapshotsToWrite.length,
  };
}

async function getEarliestPlayerRankResultHistoryDate() {
  const row = await withPlayerRankSchemaFallback(
    () =>
      db.query.gamePlayerRankResults.findFirst({
        orderBy: (table, { asc }) => [asc(table.gameCompletedAt), asc(table.gameId)],
        columns: {
          gameCompletedAt: true,
        },
      }),
    () => null,
    "get_earliest_result_history_date",
  );

  return row?.gameCompletedAt ? toHistoryDateKey(row.gameCompletedAt) : null;
}

export async function rebuildAllPlayerRankHistory(input?: { now?: Date }) {
  const earliestHistoryDate = await getEarliestPlayerRankResultHistoryDate();

  if (!earliestHistoryDate) {
    await deleteAllPlayerRankHistory();
    return {
      startDate: null,
      endDate: toHistoryDateKey(input?.now ?? new Date()),
      rebuiltDayCount: 0,
      writtenSnapshotCount: 0,
    };
  }

  return rebuildPlayerRankHistoryFromDate({
    startDate: earliestHistoryDate,
    now: input?.now,
  });
}

export async function listPlayerRankGameDeltasByGameIds(
  gameIds: string[],
): Promise<Record<string, PlayerRankGameDelta[]>> {
  const uniqueGameIds = Array.from(
    new Set(gameIds.filter((gameId) => gameId.trim().length > 0)),
  );

  if (uniqueGameIds.length === 0) {
    return {};
  }

  const rows = await withPlayerRankSchemaFallback(
    () =>
      db.query.gamePlayerRankResults.findMany({
        where: inArray(gamePlayerRankResults.gameId, uniqueGameIds),
        orderBy: (table, { desc }) => [
          desc(table.gameCompletedAt),
          desc(table.createdAt),
        ],
      }),
    () => ([] as GamePlayerRankResultRecord[]),
    "list_game_deltas_by_game_ids",
  );

  const deltasByGameId: Record<string, PlayerRankGameDelta[]> = {};

  for (const row of rows) {
    deltasByGameId[row.gameId] ??= [];
    deltasByGameId[row.gameId]?.push(buildPlayerRankGameDelta(row));
  }

  return deltasByGameId;
}

export async function listPlayerRankGameDeltasForGame(gameId: string) {
  const deltasByGameId = await listPlayerRankGameDeltasByGameIds([gameId]);
  return deltasByGameId[gameId] ?? [];
}

export async function getPlayerRankGameDeltaForUser(input: {
  gameId: string;
  userId: string;
}): Promise<PlayerRankGameDelta | null> {
  const rows = await withPlayerRankSchemaFallback(
    () =>
      db.query.gamePlayerRankResults.findMany({
        where: and(
          eq(gamePlayerRankResults.gameId, input.gameId),
          eq(gamePlayerRankResults.userId, input.userId),
        ),
        limit: 1,
      }),
    () => ([] as GamePlayerRankResultRecord[]),
    "get_game_delta_for_user",
  );

  const row = rows[0];
  return row ? buildPlayerRankGameDelta(row) : null;
}

export async function listPlayerRankGameDeltasForUser(input: {
  userId: string;
  limit?: number;
  since?: string;
}) {
  const rows = await withPlayerRankSchemaFallback(
    () =>
      db.query.gamePlayerRankResults.findMany({
        where: input.since
          ? and(
              eq(gamePlayerRankResults.userId, input.userId),
              gte(gamePlayerRankResults.gameCompletedAt, input.since),
            )
          : eq(gamePlayerRankResults.userId, input.userId),
        orderBy: (table, { desc }) => [
          desc(table.gameCompletedAt),
          desc(table.createdAt),
        ],
        limit: input.limit,
      }),
    () => ([] as GamePlayerRankResultRecord[]),
    "list_user_game_deltas",
  );

  return rows.map(buildPlayerRankGameDelta);
}

export function summarizePlayerRankRecentChanges(input: {
  points: PlayerRankChartPoint[];
  recentDays: number;
}): PlayerRankRecentChangeSummary {
  const startRankTotalMinor = input.points[0]?.playerRankTotalMinor ?? 0;
  const currentRankTotalMinor =
    input.points[input.points.length - 1]?.playerRankTotalMinor ?? 0;
  const netChangeMinor = currentRankTotalMinor - startRankTotalMinor;
  const netChange =
    netChangeMinor === 0
      ? null
      : buildPlayerRankWindowDelta({
          startTotalMinor: startRankTotalMinor,
          endTotalMinor: currentRankTotalMinor,
        });

  return {
    recentWindowLabel: `Last ${input.recentDays} days`,
    startRankTotal: formatPlayerRankTotal(startRankTotalMinor),
    startRankTotalMinor,
    currentRankTotal: formatPlayerRankTotal(currentRankTotalMinor),
    currentRankTotalMinor,
    netChange,
    recentIncrease: netChangeMinor > 0 ? netChange : null,
    recentDecrease: netChangeMinor < 0 ? netChange : null,
  };
}

export async function getPlayerRankRecentChangeSummary(
  userId: string,
  input?: {
    now?: Date;
    recentDays?: number;
  },
): Promise<PlayerRankRecentChangeSummary> {
  const recentDays = input?.recentDays ?? 30;
  const now = input?.now ?? new Date();
  const historySeries = await listPlayerRankHistorySeries({
    userIds: [userId],
    days: recentDays,
    now,
  });

  return summarizePlayerRankRecentChanges({
    points: historySeries.pointsByUserId[userId] ?? [],
    recentDays,
  });
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
      isLeaderboardDisabled: row.isLeaderboardDisabled,
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

async function listCompletedGamesForPlayerRankHealthCheck() {
  return withPlayerRankSchemaFallback(
    () =>
      db.query.games.findMany({
        where: isNotNull(games.completedAt),
        columns: {
          id: true,
          completedAt: true,
        },
        with: {
          players: {
            columns: {
              userId: true,
            },
          },
        },
        orderBy: (table, { desc }) => [desc(table.completedAt), desc(table.createdAt)],
      }),
    () =>
      [] as Array<{
        id: string;
        completedAt: string | null;
        players: Array<{ userId: string }>;
      }>,
    "list_completed_games_for_health_check",
  );
}

function getExpectedRankedPlayerCount(playerCount: number) {
  if (playerCount === 2) {
    return 2;
  }

  if (playerCount >= 3) {
    return 3;
  }

  return 0;
}

export async function getPlayerRankHealthCheck(): Promise<PlayerRankHealthCheck> {
  const activeConfig = await getActivePlayerRankConfig();

  if (!activeConfig) {
    return {
      status: "error",
      label: "Unavailable",
      message: "Player Rank config or schema is unavailable.",
      affectedGameCount: 0,
      totalCheckedGameCount: 0,
      affectedGameIds: [],
    };
  }

  const completedGames = await listCompletedGamesForPlayerRankHealthCheck();
  const gameIds = completedGames.map((game) => game.id);
  const resultRows =
    gameIds.length === 0
      ? []
      : await withPlayerRankSchemaFallback(
          () =>
            db.query.gamePlayerRankResults.findMany({
              where: inArray(gamePlayerRankResults.gameId, gameIds),
              columns: {
                gameId: true,
                userId: true,
              },
            }),
          () => [] as Array<Pick<GamePlayerRankResultRecord, "gameId" | "userId">>,
          "list_game_results_for_health_check",
        );

  const rankedUserIdsByGameId = new Map<string, Set<string>>();

  for (const row of resultRows) {
    const rankedUserIds = rankedUserIdsByGameId.get(row.gameId) ?? new Set<string>();
    rankedUserIds.add(row.userId);
    rankedUserIdsByGameId.set(row.gameId, rankedUserIds);
  }

  const affectedGameIds = completedGames
    .filter((game) => {
      const expectedRankedPlayerCount = getExpectedRankedPlayerCount(game.players.length);

      if (expectedRankedPlayerCount === 0) {
        return false;
      }

      const actualRankedPlayerCount =
        rankedUserIdsByGameId.get(game.id)?.size ?? 0;

      return actualRankedPlayerCount !== expectedRankedPlayerCount;
    })
    .map((game) => game.id);

  if (affectedGameIds.length > 0) {
    return {
      status: "review",
      label: "Needs review",
      message: `${affectedGameIds.length} completed game${affectedGameIds.length === 1 ? "" : "s"} need Player Rank recalculation.`,
      affectedGameCount: affectedGameIds.length,
      totalCheckedGameCount: completedGames.length,
      affectedGameIds,
    };
  }

  return {
    status: "good",
    label: "Good",
    message: "All completed games have the expected Player Rank coverage.",
    affectedGameCount: 0,
    totalCheckedGameCount: completedGames.length,
    affectedGameIds: [],
  };
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

export async function recalculateAffectedPlayerRankGames() {
  const healthCheck = await getPlayerRankHealthCheck();

  if (healthCheck.status !== "review") {
    return {
      processedGameCount: 0,
      changed: false,
      healthCheck,
    };
  }

  let processedGameCount = 0;

  for (const gameId of healthCheck.affectedGameIds) {
    const game = await getCompletedGameForPlayerRank(gameId);

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
    changed: processedGameCount > 0,
    healthCheck: await getPlayerRankHealthCheck(),
  };
}
