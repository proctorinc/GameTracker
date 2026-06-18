import "server-only";

import { unstable_cache } from "next/cache";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  getPlayerRankTag,
  getProfileOverviewTag,
  getPublicProfileTag,
} from "@/lib/cache-tags";
import { getUserById } from "@/lib/db/store";
import {
  getActivePlayerRankConfig,
  getUserPlayerRankSummary,
} from "@/lib/db/store/player-rank.store";
import { formatPlayerRankTotal } from "@/lib/player-rank";
import { getOwnProfileStatsPageData } from "../../[id]/page-data";
import type { ProfileOverviewPageData } from "./types";

const PROFILE_OVERVIEW_REVALIDATE_SECONDS = 15;

export async function getProfileOverviewPageData(): Promise<ProfileOverviewPageData> {
  const sessionUser = await loadCurrentUser();

  return getProfileOverviewPageDataCached(sessionUser.id);
}

async function getProfileOverviewPageDataCached(
  userId: string,
): Promise<ProfileOverviewPageData> {
  return unstable_cache(
    async () => {
      const [user, publicProfile] = await Promise.all([
        getUserById(userId),
        getOwnProfileStatsPageData(userId),
      ]);

      if (!user || !publicProfile) {
        throw new Error("Authenticated user not found");
      }

      const [playerRankSummary, playerRankConfig] =
        user.role === "admin"
          ? await Promise.all([
              getUserPlayerRankSummary(userId),
              getActivePlayerRankConfig(),
            ])
          : [null, null];

      return {
        user: {
          id: user.id,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          color: user.color,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
        },
        profile: publicProfile.profile,
        canViewPlayerRank: user.role === "admin",
        playerRankTotal: playerRankSummary?.playerRankTotal ?? null,
        playerRankPosition: playerRankSummary?.playerRankPosition ?? null,
        playerRankWindowLabel: playerRankSummary?.playerRankWindowLabel ?? null,
        playerRankGamesCount: playerRankSummary?.playerRankGamesCount ?? null,
        topThreeFinishes: playerRankSummary?.topThreeFinishes ?? null,
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
        defaultBestFriend: publicProfile.defaultBestFriend,
        stats: publicProfile.stats,
        comparisonOptions: publicProfile.comparisonOptions,
        comparisonSummariesByUserId: publicProfile.comparisonSummariesByUserId,
        defaultComparisonUserId: publicProfile.defaultComparisonUserId,
      };
    },
    [userId],
    {
      tags: [
        getProfileOverviewTag(userId),
        getPublicProfileTag(userId),
        getPlayerRankTag(userId),
      ],
      revalidate: PROFILE_OVERVIEW_REVALIDATE_SECONDS,
    },
  )();
}
