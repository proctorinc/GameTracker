import "server-only";

import { unstable_cache } from "next/cache";
import { getFriendsPageCollections } from "@/app/actions/pages/friends";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  getFriendsTag,
  getPlayerRankHistoryTag,
  getPlayerRankStandingsTag,
} from "@/lib/cache-tags";
import {
  getUserPlayerRankSummary,
  listPlayerRankGameDeltasByGameIds,
  listPlayerRankHistorySeries,
  listPlayerRankStandings,
  type PlayerRankChartPoint,
  type PlayerRankGameDelta,
} from "@/lib/db/store/player-rank.store";
import { logError, logInfo } from "@/lib/server-log";
import { getServerRequestContext } from "@/lib/server-request-context";
import {
  buildActivityLeaderboard,
  type ActivityLeaderboardFriend,
} from "./leaderboard-utils";

const ACTIVITY_PAGE_REVALIDATE_SECONDS = 15;

export type ActivityPageData = {
  user: Pick<
    Awaited<ReturnType<typeof loadCurrentUser>>,
    "id" | "firstName" | "lastName" | "color" | "playerRankLeaderboardDisabled"
  >;
  friends: Awaited<ReturnType<typeof getFriendsPageCollections>>["friends"];
  friendActivity: Array<
    Awaited<ReturnType<typeof getFriendsPageCollections>>["friendActivity"][number] & {
      currentUserRankDelta: PlayerRankGameDelta | null;
    }
  >;
  leaderboardFriends: ActivityLeaderboardFriend[];
  playerRankTrend: {
    rankTotal: string | null;
    rankPosition: number | null;
    windowLabel: string | null;
    chartPoints: PlayerRankChartPoint[];
    hasHistory: boolean;
  } | null;
};

export async function getActivityPageData(): Promise<ActivityPageData> {
  const requestContext = await getServerRequestContext();

  try {
    const user = await loadCurrentUser();
    const data = await getActivityPageDataCached(
      user.id,
      {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        color: user.color,
        playerRankLeaderboardDisabled: user.playerRankLeaderboardDisabled,
      },
    );

    logInfo("activity.page_data.read.succeeded", {
      ...requestContext,
      userId: user.id,
      friendCount: data.friends.length,
      activityCount: data.friendActivity.length,
      leaderboardCount: data.leaderboardFriends.length,
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        color: user.color,
        playerRankLeaderboardDisabled: user.playerRankLeaderboardDisabled,
      },
      ...data,
    };
  } catch (error) {
    logError("activity.page_data.read.failed", error, requestContext);
    throw error;
  }
}

async function getActivityPageDataCached(
  userId: string,
  currentUser: Pick<
    Awaited<ReturnType<typeof loadCurrentUser>>,
    "id" | "firstName" | "lastName" | "color" | "playerRankLeaderboardDisabled"
  >,
) {
  return unstable_cache(
    async () => {
      const [collections, standings] = await Promise.all([
        getFriendsPageCollections({
          userId,
        }),
        listPlayerRankStandings(),
      ]);
      const [playerRankSummary, historySeries] = await Promise.all([
        getUserPlayerRankSummary(userId),
        listPlayerRankHistorySeries({
          userIds: [userId],
          days: 30,
        }),
      ]);
      const playerRankDeltasByGameId = await listPlayerRankGameDeltasByGameIds(
        collections.friendActivity.map((game) => game.id),
      );
      const currentUserChartPoints = historySeries.pointsByUserId[userId] ?? [];

      return {
        friends: collections.friends,
        friendActivity: collections.friendActivity.map((game) => ({
          ...game,
          currentUserRankDelta:
            playerRankDeltasByGameId[game.id]?.find((delta) => delta.userId === userId) ??
            null,
        })),
        leaderboardFriends: buildActivityLeaderboard({
          currentUser,
          friends: collections.friends,
          friendActivity: collections.friendActivity,
          playerRankDeltasByGameId,
          standings,
        }),
        playerRankTrend: playerRankSummary
          ? {
              rankTotal: playerRankSummary.playerRankTotal,
              rankPosition: playerRankSummary.playerRankPosition,
              windowLabel: playerRankSummary.playerRankWindowLabel,
              chartPoints: currentUserChartPoints,
              hasHistory: currentUserChartPoints.some((point) => point.hasSnapshot),
            }
          : null,
      };
    },
    [userId],
    {
      tags: [
        getFriendsTag(userId),
        getPlayerRankStandingsTag(),
        getPlayerRankHistoryTag(),
      ],
      revalidate: ACTIVITY_PAGE_REVALIDATE_SECONDS,
    },
  )();
}
