import "server-only";

import { unstable_cache } from "next/cache";
import { getFriendsPageCollections } from "@/app/actions/pages/friends";
import { buildActivityLeaderboard } from "@/app/(protected)/activity/_components/leaderboard-utils";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  getFriendsTag,
  getPlayerRankHistoryTag,
  getPlayerRankStandingsTag,
  getPlayerRankTag,
} from "@/lib/cache-tags";
import {
  getActivePlayerRankConfig,
  listPlayerRankHistorySeries,
  listPlayerRankStandings,
  summarizePlayerRankRecentChanges,
} from "@/lib/db/store/player-rank.store";
import { formatPlayerRankTotal } from "@/lib/player-rank";

const PLAYER_RANK_PAGE_REVALIDATE_SECONDS = 15;

export type PlayerRankPageData = Awaited<ReturnType<typeof getPlayerRankPageData>>;

export async function getPlayerRankPageData() {
  const user = await loadCurrentUser({
    onMissingAuth: "redirect",
    returnPath: "/player-rank",
  });
  return getPlayerRankPageDataCached(user.id);
}

async function getPlayerRankPageDataCached(userId: string) {
  return unstable_cache(
    async () => {
      const [
        playerRankConfig,
        currentUser,
        collections,
        standings,
      ] = await Promise.all([
          getActivePlayerRankConfig(),
          loadCurrentUser({
            onMissingAuth: "redirect",
            returnPath: "/player-rank",
          }),
          getFriendsPageCollections({ userId }),
          listPlayerRankStandings(),
        ]);
      const friendStandings = buildActivityLeaderboard({
        currentUser: {
          id: currentUser.id,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          color: currentUser.color,
          playerRankLeaderboardDisabled: currentUser.playerRankLeaderboardDisabled,
        },
        friends: collections.friends,
        friendActivity: collections.friendActivity,
        standings,
      });
      const comparisonUserIds = friendStandings.map((row) => row.user.id);
      const historySeries = await listPlayerRankHistorySeries({
        userIds: comparisonUserIds,
        days: 30,
      });
      const comparisonSeries = friendStandings.map((row) => {
        const chartPoints = historySeries.pointsByUserId[row.user.id] ?? [];

        return {
          userId: row.user.id,
          firstName: row.user.firstName,
          lastName: row.user.lastName,
          color: row.user.color,
          displayName:
            [row.user.firstName, row.user.lastName].filter(Boolean).join(" ").trim() ||
            "Skybo Player",
          isCurrentUser: row.user.id === userId,
          currentRankTotal: row.playerRankTotal,
          currentRankTotalMinor: row.playerRankTotalMinor,
          currentPosition: row.globalPosition,
          friendPosition: row.friendPosition,
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
      const defaultSelectedUserIds = [
        userId,
        ...comparisonSeries
          .filter((series) => series.userId !== userId)
          .slice(0, 4)
          .map((series) => series.userId),
      ];

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
        currentUserId: userId,
        comparisonSeries,
        summaryByUserId,
        defaultSelectedUserIds,
        historyDateKeys: historySeries.historyDateKeys,
      };
    },
    [userId],
    {
      tags: [
        getFriendsTag(userId),
        getPlayerRankTag(userId),
        getPlayerRankStandingsTag(),
        getPlayerRankHistoryTag(),
      ],
      revalidate: PLAYER_RANK_PAGE_REVALIDATE_SECONDS,
    },
  )();
}
