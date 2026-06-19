import "server-only";

import { unstable_cache } from "next/cache";
import { getFriendsPageCollections } from "@/app/actions/pages/friends";
import { buildActivityLeaderboard } from "@/app/(protected)/activity/_components/leaderboard-utils";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  getFriendsTag,
  getPlayerRankStandingsTag,
  getPlayerRankTag,
} from "@/lib/cache-tags";
import {
  getActivePlayerRankConfig,
  getPlayerRankRecentChangeSummary,
  getUserPlayerRankSummary,
  listPlayerRankStandings,
} from "@/lib/db/store/player-rank.store";
import { formatPlayerRankTotal } from "@/lib/player-rank";

const PLAYER_RANK_PAGE_REVALIDATE_SECONDS = 15;

export type PlayerRankPageData = Awaited<ReturnType<typeof getPlayerRankPageData>>;

export async function getPlayerRankPageData() {
  const user = await loadCurrentUser();
  return getPlayerRankPageDataCached(user.id);
}

async function getPlayerRankPageDataCached(userId: string) {
  return unstable_cache(
    async () => {
      const [
        playerRankSummary,
        playerRankConfig,
        recentChangeSummary,
        currentUser,
        collections,
        standings,
      ] = await Promise.all([
          getUserPlayerRankSummary(userId),
          getActivePlayerRankConfig(),
          getPlayerRankRecentChangeSummary(userId),
          loadCurrentUser(),
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
      const currentUserFriendStanding =
        friendStandings.find((row) => row.user.id === userId) ?? null;

      return {
        canViewPlayerRank: Boolean(playerRankConfig),
        friendStandings,
        playerRankTotal: playerRankSummary?.playerRankTotal ?? null,
        playerRankPosition: currentUserFriendStanding?.friendPosition ?? null,
        playerRankWindowLabel: playerRankSummary?.playerRankWindowLabel ?? null,
        playerRankGamesCount: playerRankSummary?.playerRankGamesCount ?? null,
        topThreeFinishes: playerRankSummary?.topThreeFinishes ?? null,
        playerRankRecentChangeSummary: playerRankConfig ? recentChangeSummary : null,
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
      };
    },
    [userId],
    {
      tags: [getFriendsTag(userId), getPlayerRankTag(userId), getPlayerRankStandingsTag()],
      revalidate: PLAYER_RANK_PAGE_REVALIDATE_SECONDS,
    },
  )();
}
