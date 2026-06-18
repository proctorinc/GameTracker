import "server-only";

import { unstable_cache } from "next/cache";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  getPlayerRankStandingsTag,
  getPlayerRankTag,
} from "@/lib/cache-tags";
import {
  getActivePlayerRankConfig,
  getPlayerRankRecentChangeSummary,
  getUserPlayerRankSummary,
  listVisiblePlayerRankStandings,
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
      const [playerRankSummary, playerRankConfig, recentChangeSummary, standings] =
        await Promise.all([
          getUserPlayerRankSummary(userId),
          getActivePlayerRankConfig(),
          getPlayerRankRecentChangeSummary(userId),
          listVisiblePlayerRankStandings(),
        ]);

      return {
        canViewPlayerRank: Boolean(playerRankConfig),
        standings,
        playerRankTotal: playerRankSummary?.playerRankTotal ?? null,
        playerRankPosition: playerRankSummary?.playerRankPosition ?? null,
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
      tags: [getPlayerRankTag(userId), getPlayerRankStandingsTag()],
      revalidate: PLAYER_RANK_PAGE_REVALIDATE_SECONDS,
    },
  )();
}
