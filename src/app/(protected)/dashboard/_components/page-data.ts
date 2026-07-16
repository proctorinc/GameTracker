import "server-only";

import { unstable_cache } from "next/cache";
import { getFriendsPageCollections } from "@/app/actions/pages/friends";
import { buildFriendRankSummaries } from "@/app/(protected)/activity/_components/leaderboard-utils";
import { getDashboardPageCollections } from "@/app/actions/pages/dashboard";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  getCardCatalogTag,
  getFeatureFlagsTag,
  getDashboardTag,
  getPlayerRankTag,
  getProfileIdentityTag,
} from "@/lib/cache-tags";
import {
  getActivePlayerRankConfig,
  getPlayerRankRecentChangeSummary,
  listPlayerRankGameDeltasByGameIds,
  listPlayerRankStandings,
} from "@/lib/db/store/player-rank.store";
import { formatPlayerRankTotal } from "@/lib/player-rank";
import { isNextRedirectError } from "@/lib/next-navigation-errors";
import { logError, logInfo } from "@/lib/server-log";
import { getServerRequestContext } from "@/lib/server-request-context";

const DASHBOARD_PAGE_REVALIDATE_SECONDS = 15;

export async function getDashboardOverviewPageData() {
  const requestContext = await getServerRequestContext();

  try {
    const user = await loadCurrentUser({
      onMissingAuth: "redirect",
      returnPath: "/dashboard",
    });
    const data = await getDashboardOverviewPageDataCached(user.id);
    const [
      friendCollections,
      standings,
      playerRankSummary,
      playerRankConfig,
      playerRankRecentChangeSummary,
    ] =
      await Promise.all([
        getFriendsPageCollections({ userId: user.id }),
        listPlayerRankStandings(),
        listPlayerRankStandings().then((rows) =>
          rows.find((row) => row.userId === user.id) ?? null,
        ),
        getActivePlayerRankConfig(),
        getPlayerRankRecentChangeSummary(user.id),
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
      friends: friendCollections.friends,
      standings,
    }).find((row) => row.user.id === user.id);
    const playerRankDeltasByGameId = await listPlayerRankGameDeltasByGameIds(
      data.recentCompletedGames.map((game) => game.id),
    );

    logInfo("dashboard.page_data.read.succeeded", {
      ...requestContext,
      userId: user.id,
      incomingInvitationCount: data.incomingInvitations.length,
      recentActiveGameCount: data.recentActiveGames.length,
      recentCompletedGameCount: data.recentCompletedGames.length,
      recentGameTitleCount: data.recentGameTitles.length,
    });

    return {
      user,
      ...data,
      recentCompletedGames: data.recentCompletedGames.map((game) => ({
        ...game,
        currentUserRankDelta:
          playerRankDeltasByGameId[game.id]?.find((delta) => delta.userId === user.id) ??
          null,
      })),
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
    };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    logError("dashboard.page_data.read.failed", error, {
      ...requestContext,
    });
    throw error;
  }
}

async function getDashboardOverviewPageDataCached(userId: string) {
  return unstable_cache(
    async () =>
      getDashboardPageCollections({
        userId,
      }),
    [userId],
    {
      tags: [
        getDashboardTag(userId),
        getPlayerRankTag(userId),
        getCardCatalogTag(),
        getFeatureFlagsTag(),
        getProfileIdentityTag(),
      ],
      revalidate: DASHBOARD_PAGE_REVALIDATE_SECONDS,
    },
  )();
}
