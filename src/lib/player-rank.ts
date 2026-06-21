import type { GameScoringMode } from "./db/schema";
import { deriveGamePlacementOutcome } from "./game-placement";

export type PlayerRankConfig = {
  id: string;
  windowMonths: number;
  defaultMaxPrizePool: number;
  prizePoolByPlayerCount: Record<number, number>;
  smallGameDistribution: Record<number, [number, number, number]>;
  largeGameDistribution: [number, number, number];
};

export type PlayerRankPlayer = {
  userId: string;
  score: number;
};

export type PlayerRankGameLike = {
  completedAt: string;
  scoringMode: GameScoringMode;
  players: PlayerRankPlayer[];
  winnerUserIds?: string[];
  placementSelections?: Array<{
    placement: 1 | 2 | 3;
    userIds: string[];
  }>;
};

export type PlayerRankPayout = {
  gameCompletedAt: string;
  userId: string;
  playerCount: number;
  placement: number;
  tieSize: number;
  prizePoolMinor: number;
  payoutPercentBps: number;
  pointsAwardedMinor: number;
};

export type PlayerRankStandingRow = {
  userId: string;
  pointsAwardedMinor: number;
  playerRankPosition: number | null;
  playerRankGamesCount: number;
  topThreeFinishes: number;
};

function uniqueWinnerIds(winnerUserIds: string[] | undefined, players: PlayerRankPlayer[]) {
  const allowedUserIds = new Set(players.map((player) => player.userId));
  return Array.from(
    new Set((winnerUserIds ?? []).filter((userId) => allowedUserIds.has(userId))),
  );
}

function normalizePlacementSelections(
  placementSelections: PlayerRankGameLike["placementSelections"],
  players: PlayerRankPlayer[],
) {
  const allowedUserIds = new Set(players.map((player) => player.userId));
  const seenUserIds = new Set<string>();

  return (placementSelections ?? [])
    .filter((selection) => selection.placement >= 1 && selection.placement <= 3)
    .sort((left, right) => left.placement - right.placement)
    .map((selection) => ({
      placement: selection.placement,
      userIds: selection.userIds.filter((userId) => {
        if (!allowedUserIds.has(userId) || seenUserIds.has(userId)) {
          return false;
        }

        seenUserIds.add(userId);
        return true;
      }),
    }))
    .filter((selection) => selection.userIds.length > 0);
}

export function getPlayerRankWindowStart(windowMonths: number, now = new Date()) {
  const value = new Date(now);
  value.setUTCMonth(value.getUTCMonth() - windowMonths);
  return value.toISOString();
}

export function formatPlayerRankTotal(pointsAwardedMinor: number) {
  const value = pointsAwardedMinor / 100;
  return value.toFixed(0);
}

export function formatSignedPlayerRankDelta(pointsAwardedMinor: number) {
  const formatted = formatPlayerRankTotal(Math.abs(pointsAwardedMinor));

  if (pointsAwardedMinor > 0) {
    return `+${formatted}`;
  }

  if (pointsAwardedMinor < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

export function getPrizePoolMinor(
  playerCount: number,
  config: Pick<PlayerRankConfig, "defaultMaxPrizePool" | "prizePoolByPlayerCount">,
) {
  return config.prizePoolByPlayerCount[playerCount] ?? config.defaultMaxPrizePool;
}

export function getDistributionBps(
  playerCount: number,
  config: Pick<PlayerRankConfig, "smallGameDistribution" | "largeGameDistribution">,
) {
  return config.smallGameDistribution[playerCount] ?? config.largeGameDistribution;
}

function buildTiedPlacementGroups(input: {
  scoringMode: GameScoringMode;
  players: PlayerRankPlayer[];
  winnerUserIds?: string[];
  placementSelections?: PlayerRankGameLike["placementSelections"];
}) {
  if (input.scoringMode === "no_score") {
    const normalizedSelections = normalizePlacementSelections(
      input.placementSelections,
      input.players,
    );
    const placementOutcome = deriveGamePlacementOutcome({
      scoringMode: input.scoringMode,
      participants: input.players,
      resultPlacements: normalizedSelections.flatMap((selection) =>
        selection.userIds.map((userId) => ({
          userId,
          placement: selection.placement,
        })),
      ),
      winnerUserIds: uniqueWinnerIds(input.winnerUserIds, input.players),
    });
    const playerIdsByPlacement = new Map<number, string[]>();

    for (const player of input.players) {
      const placement = placementOutcome.placementByUserId[player.userId];

      if (placement === undefined) {
        continue;
      }

      const current = playerIdsByPlacement.get(placement) ?? [];
      playerIdsByPlacement.set(placement, [...current, player.userId]);
    }

    return Array.from(playerIdsByPlacement.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([placement, playerIds]) => ({
        placement,
        playerIds,
      }));
  }

  const sortedPlayers = [...input.players].sort((left, right) =>
    input.scoringMode === "highest_wins"
      ? right.score - left.score
      : left.score - right.score,
  );
  const groups: Array<{ placement: number; playerIds: string[] }> = [];
  let cursor = 0;

  while (cursor < sortedPlayers.length) {
    const start = cursor;
    const score = sortedPlayers[cursor]!.score;
    const playerIds = [sortedPlayers[cursor]!.userId];
    cursor += 1;

    while (cursor < sortedPlayers.length && sortedPlayers[cursor]!.score === score) {
      playerIds.push(sortedPlayers[cursor]!.userId);
      cursor += 1;
    }

    groups.push({
      placement: start + 1,
      playerIds,
    });
  }

  return groups;
}

export function computePlayerRankPayouts(
  game: PlayerRankGameLike,
  config: PlayerRankConfig,
): PlayerRankPayout[] {
  const playerCount = game.players.length;

  if (playerCount === 0) {
    return [];
  }

  const prizePoolMinor = getPrizePoolMinor(playerCount, config);
  const distributionBps = getDistributionBps(playerCount, config);

  if (game.scoringMode === "no_score") {
    const groups = buildTiedPlacementGroups(game);
    const payoutByUserId = new Map<string, PlayerRankPayout>();

    for (const group of groups) {
      const payoutPercentBps =
        group.placement >= 1 && group.placement <= 3
          ? (distributionBps[group.placement - 1] ?? 0)
          : 0;
      const pointsAwardedMinor =
        payoutPercentBps === 0
          ? 0
          : Math.floor(
              (prizePoolMinor * payoutPercentBps) / 10_000 / group.playerIds.length,
            );

      for (const userId of group.playerIds) {
        payoutByUserId.set(userId, {
          gameCompletedAt: game.completedAt,
          userId,
          playerCount,
          placement: group.placement,
          tieSize: group.playerIds.length,
          prizePoolMinor,
          payoutPercentBps,
          pointsAwardedMinor,
        });
      }
    }

    return game.players.map((player) =>
      payoutByUserId.get(player.userId) ?? {
        gameCompletedAt: game.completedAt,
        userId: player.userId,
        playerCount,
        placement: playerCount,
        tieSize: 1,
        prizePoolMinor,
        payoutPercentBps: 0,
        pointsAwardedMinor: 0,
      },
    );
  }

  const maxPaidPlacement = distributionBps.reduce(
    (count, shareBps) => count + (shareBps > 0 ? 1 : 0),
    0,
  );

  const groups = buildTiedPlacementGroups(game);
  const payoutByUserId = new Map<string, PlayerRankPayout>();

  for (const group of groups) {
    const tieSize = group.playerIds.length;
    const occupiedSlots = Array.from({ length: tieSize }, (_, index) => group.placement + index)
      .filter((slot) => slot <= maxPaidPlacement);
    const payoutPercentBps = occupiedSlots.reduce(
      (sum, slot) => sum + (distributionBps[slot - 1] ?? 0),
      0,
    );
    const pointsAwardedMinor =
      payoutPercentBps === 0
        ? 0
        : Math.floor((prizePoolMinor * payoutPercentBps) / 10_000 / tieSize);

    for (const userId of group.playerIds) {
      payoutByUserId.set(userId, {
        gameCompletedAt: game.completedAt,
        userId,
        playerCount,
        placement: group.placement,
        tieSize,
        prizePoolMinor,
        payoutPercentBps,
        pointsAwardedMinor,
      });
    }
  }

  return game.players.map((player) =>
    payoutByUserId.get(player.userId) ?? {
      gameCompletedAt: game.completedAt,
      userId: player.userId,
      playerCount,
      placement: playerCount,
      tieSize: 1,
      prizePoolMinor,
      payoutPercentBps: 0,
      pointsAwardedMinor: 0,
    },
  );
}

export function assignDensePlayerRankPositions<
  T extends {
    userId: string;
    pointsAwardedMinor: number;
    playerRankGamesCount: number;
    topThreeFinishes: number;
  },
>(rows: T[]): Array<T & { playerRankPosition: number }> {
  const sortedRows = [...rows].sort((left, right) => {
    if (right.pointsAwardedMinor !== left.pointsAwardedMinor) {
      return right.pointsAwardedMinor - left.pointsAwardedMinor;
    }

    if (right.topThreeFinishes !== left.topThreeFinishes) {
      return right.topThreeFinishes - left.topThreeFinishes;
    }

    if (right.playerRankGamesCount !== left.playerRankGamesCount) {
      return right.playerRankGamesCount - left.playerRankGamesCount;
    }

    return left.userId.localeCompare(right.userId);
  });

  let currentPosition = 0;
  let lastPoints: number | null = null;

  return sortedRows.map((row) => {
    if (lastPoints === null || row.pointsAwardedMinor !== lastPoints) {
      currentPosition += 1;
      lastPoints = row.pointsAwardedMinor;
    }

    return {
      ...row,
      playerRankPosition: currentPosition,
    };
  });
}
