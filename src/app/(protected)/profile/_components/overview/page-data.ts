import "server-only";

import { unstable_cache } from "next/cache";
import { getFriendConnectionsPageData } from "@/app/(protected)/friends/_components/page-data";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  getFriendsTag,
  getPlayerRankTag,
  getProfileOverviewTag,
  getPublicProfileTag,
} from "@/lib/cache-tags";
import { getUserById } from "@/lib/db/store";
import {
  getActivePlayerRankConfig,
  getPlayerRankRecentChangeSummary,
  getUserPlayerRankSummary,
} from "@/lib/db/store/player-rank.store";
import { formatPlayerRankTotal } from "@/lib/player-rank";
import { getOwnProfileStatsPageData } from "../../[id]/page-data";
import type { ProfileOverviewPageData, ProfileOverviewTab } from "./types";

const PROFILE_OVERVIEW_REVALIDATE_SECONDS = 15;

export function selectProfileOverviewTab(input: {
  tab?: string | null;
  invites?: string | null;
}): ProfileOverviewTab {
  if (input.invites === "1") {
    return "friends";
  }

  if (input.tab === "friends" || input.tab === "settings") {
    return input.tab;
  }

  return "stats";
}

export async function getProfileOverviewPageData(input?: {
  tab?: string | null;
  invites?: string | null;
}): Promise<ProfileOverviewPageData> {
  const sessionUser = await loadCurrentUser();
  const initialTab = selectProfileOverviewTab(input ?? {});
  const showInviteNotice = input?.invites === "1";

  return getProfileOverviewPageDataCached({
    userId: sessionUser.id,
    initialTab,
    showInviteNotice,
  });
}

async function getProfileOverviewPageDataCached(input: {
  userId: string;
  initialTab: ProfileOverviewTab;
  showInviteNotice: boolean;
}): Promise<ProfileOverviewPageData> {
  return unstable_cache(
    async () => {
      const [user, publicProfile, socialData] = await Promise.all([
        getUserById(input.userId),
        getOwnProfileStatsPageData(input.userId),
        getFriendConnectionsPageData(),
      ]);

      if (!user || !publicProfile) {
        throw new Error("Authenticated user not found");
      }

      const [playerRankSummary, playerRankConfig, playerRankRecentChangeSummary] =
        await Promise.all([
          getUserPlayerRankSummary(input.userId),
          getActivePlayerRankConfig(),
          getPlayerRankRecentChangeSummary(input.userId),
        ]);

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
        canViewPlayerRank: Boolean(playerRankConfig),
        playerRankTotal: playerRankSummary?.playerRankTotal ?? null,
        playerRankPosition: playerRankSummary?.playerRankPosition ?? null,
        playerRankWindowLabel: playerRankSummary?.playerRankWindowLabel ?? null,
        playerRankGamesCount: playerRankSummary?.playerRankGamesCount ?? null,
        topThreeFinishes: playerRankSummary?.topThreeFinishes ?? null,
        playerRankRecentChangeSummary: playerRankConfig
          ? playerRankRecentChangeSummary
          : null,
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
        socialData,
        hasPendingFriendInvitations: socialData.incomingInvitations.length > 0,
        showInviteNotice: input.showInviteNotice,
        initialTab: input.initialTab,
      };
    },
    [input.userId, input.initialTab, input.showInviteNotice ? "1" : "0"],
    {
      tags: [
        getProfileOverviewTag(input.userId),
        getPublicProfileTag(input.userId),
        getPlayerRankTag(input.userId),
        getFriendsTag(input.userId),
      ],
      revalidate: PROFILE_OVERVIEW_REVALIDATE_SECONDS,
    },
  )();
}
