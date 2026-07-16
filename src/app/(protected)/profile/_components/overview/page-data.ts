import "server-only";

import { buildFriendRankSummaries } from "@/app/(protected)/activity/_components/leaderboard-utils";
import { unstable_cache } from "next/cache";
import { getFriendConnectionsPageData } from "@/app/(protected)/friends/_components/page-data";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  getFriendsTag,
  getCardCatalogTag,
  getFeatureFlagsTag,
  getPlayerRankTag,
  getProfileIdentityTag,
  getProfileOverviewTag,
  getPublicProfileTag,
  getTitlesTag,
} from "@/lib/cache-tags";
import { getUserById } from "@/lib/db/store";
import { getCardCollectionForOwner } from "@/lib/collectible-cards";
import {
  getActivePlayerRankConfig,
  getPlayerRankRecentChangeSummary,
  getUserPlayerRankSummary,
  listPlayerRankStandings,
} from "@/lib/db/store/player-rank.store";
import { formatPlayerRankTotal } from "@/lib/player-rank";
import { getOwnProfileStatsPageData } from "../../[id]/page-data";
import type { ProfileOverviewPageData, ProfileOverviewTab } from "./types";
import { areCardsEnabled } from "@/lib/db/store/feature-flags.store";

const PROFILE_OVERVIEW_REVALIDATE_SECONDS = 15;

export function selectProfileOverviewTab(input: {
  tab?: string | null;
  invites?: string | null;
}): ProfileOverviewTab {
  if (input.invites === "1") {
    return "friends";
  }

  if (
    input.tab === "friends" ||
    input.tab === "collection" ||
    input.tab === "settings"
  ) {
    return input.tab;
  }

  return "stats";
}

export async function getProfileOverviewPageData(input?: {
  tab?: string | null;
  invites?: string | null;
}): Promise<ProfileOverviewPageData> {
  const sessionUser = await loadCurrentUser({
    onMissingAuth: "redirect",
    returnPath: "/profile",
  });
  const cardsEnabled = await areCardsEnabled();
  const selectedTab = selectProfileOverviewTab(input ?? {});
  const initialTab =
    !cardsEnabled && selectedTab === "collection" ? "stats" : selectedTab;
  const showInviteNotice = input?.invites === "1";

  return getProfileOverviewPageDataCached({
    userId: sessionUser.id,
    initialTab,
    showInviteNotice,
    cardsEnabled,
  });
}

async function getProfileOverviewPageDataCached(input: {
  userId: string;
  initialTab: ProfileOverviewTab;
  showInviteNotice: boolean;
  cardsEnabled: boolean;
}): Promise<ProfileOverviewPageData> {
  return unstable_cache(
    async () => {
      const [user, publicProfile, socialData, cardCollection] = await Promise.all([
        getUserById(input.userId),
        getOwnProfileStatsPageData(input.userId),
        getFriendConnectionsPageData(),
        input.cardsEnabled
          ? getCardCollectionForOwner(input.userId)
          : Promise.resolve([]),
      ]);

      if (!user || !publicProfile) {
        throw new Error("Authenticated user not found");
      }

      const [
        playerRankSummary,
        playerRankConfig,
        playerRankRecentChangeSummary,
        standings,
      ] =
        await Promise.all([
          getUserPlayerRankSummary(input.userId),
          getActivePlayerRankConfig(),
          getPlayerRankRecentChangeSummary(input.userId),
          listPlayerRankStandings(),
        ]);
      const friendRankSummary = buildFriendRankSummaries({
        currentUser: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          color: user.color,
          avatarUrl: user.avatarUrl,
          playerRankLeaderboardDisabled: user.playerRankLeaderboardDisabled,
        },
        friends: socialData.friends,
        standings,
      }).find((row) => row.user.id === input.userId);
      return {
        cardsEnabled: input.cardsEnabled,
        user: {
          id: user.id,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          color: user.color,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
        profile: publicProfile.profile,
        canViewPlayerRank: Boolean(playerRankConfig),
        playerRankTotal: playerRankSummary?.playerRankTotal ?? null,
        playerRankPosition: friendRankSummary?.friendPosition ?? null,
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
        cardCollection,
      };
    },
    [
      input.userId,
      input.initialTab,
      input.showInviteNotice ? "1" : "0",
      input.cardsEnabled ? "cards-on" : "cards-off",
    ],
    {
      tags: [
        getProfileOverviewTag(input.userId),
        getPublicProfileTag(input.userId),
        getPlayerRankTag(input.userId),
        getFriendsTag(input.userId),
        getTitlesTag(input.userId),
        getCardCatalogTag(),
        getFeatureFlagsTag(),
        getProfileIdentityTag(),
      ],
      revalidate: PROFILE_OVERVIEW_REVALIDATE_SECONDS,
    },
  )();
}
