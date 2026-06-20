import "server-only";

import type { PlayerRankPageData } from "@/app/(protected)/player-rank/_components/page-data";
import {
  getActivePlayerRankConfig,
  listAdminVisibleLeaderboardUsers,
  listPlayerRankHistorySeries,
  listPlayerRankStandings,
  summarizePlayerRankRecentChanges,
} from "@/lib/db/store";
import { formatPlayerRankTotal } from "@/lib/player-rank";

export async function getAdminPlayerRankPageData(): Promise<PlayerRankPageData> {
  const [playerRankConfig, visibleUsers, standings] = await Promise.all([
    getActivePlayerRankConfig(),
    listAdminVisibleLeaderboardUsers(),
    listPlayerRankStandings(),
  ]);
  const comparisonUserIds = standings
    .filter((row) => visibleUsers.some((user) => user.id === row.userId))
    .map((row) => row.userId);
  const historySeries = await listPlayerRankHistorySeries({
    userIds: comparisonUserIds,
    days: 30,
  });
  const visibleUsersById = new Map(visibleUsers.map((user) => [user.id, user]));
  const comparisonSeries = standings
    .filter((row) => visibleUsersById.has(row.userId))
    .map((row, index) => {
      const user = visibleUsersById.get(row.userId)!;
      const chartPoints = historySeries.pointsByUserId[row.userId] ?? [];

      return {
        userId: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        color: user.color,
        displayName: row.displayName,
        isCurrentUser: false,
        currentRankTotal: row.playerRankTotal,
        currentRankTotalMinor: row.playerRankTotalMinor,
        currentPosition: row.playerRankPosition,
        friendPosition: index + 1,
        playerRankGamesCount: row.playerRankGamesCount,
        topThreeFinishes: row.topThreeFinishes,
        chartPoints,
        hasHistory: chartPoints.some((point) => point.hasSnapshot),
      };
    });
  const summaryByUserId = Object.fromEntries(
    comparisonSeries.map((series) => [
      series.userId,
      {
        userId: series.userId,
        firstName: series.firstName,
        lastName: series.lastName,
        displayName: series.displayName,
        color: series.color,
        rankTotal: series.currentRankTotal,
        rankPosition: series.currentPosition,
        rankGamesCount: series.playerRankGamesCount,
        topThreeFinishes: series.topThreeFinishes,
        recentChangeSummary: summarizePlayerRankRecentChanges({
          points: series.chartPoints,
          recentDays: historySeries.historyDateKeys.length || 30,
        }),
      },
    ]),
  );
  const defaultSelectedUserIds = comparisonSeries
    .slice(0, 5)
    .map((series) => series.userId);
  const highlightedUserId = defaultSelectedUserIds[0] ?? "";

  return {
    canViewPlayerRank: Boolean(playerRankConfig),
    playerRankWindowLabel: "30-day rank history",
    twoPlayerPrizePool: playerRankConfig
      ? formatPlayerRankTotal(playerRankConfig.prizePoolByPlayerCount[2] ?? 0)
      : null,
    threePlayerPrizePool: playerRankConfig
      ? formatPlayerRankTotal(playerRankConfig.prizePoolByPlayerCount[3] ?? 0)
      : null,
    sixPlusPlayerPrizePool: playerRankConfig
      ? formatPlayerRankTotal(
          playerRankConfig.prizePoolByPlayerCount[6] ??
            playerRankConfig.defaultMaxPrizePool,
        )
      : null,
    currentUserId: highlightedUserId,
    comparisonSeries,
    summaryByUserId,
    defaultSelectedUserIds,
    historyDateKeys: historySeries.historyDateKeys,
  };
}
