import "server-only";

import { unstable_cache } from "next/cache";
import {
  type GameHistoryPageCollections,
  getGameHistoryPageCollections,
} from "@/app/actions/pages/game-history";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  getGameHistoryTag,
  getProfileIdentityTag,
  getTitlesGlobalTag,
} from "@/lib/cache-tags";
import { isNextRedirectError } from "@/lib/next-navigation-errors";
import { logError, logInfo } from "@/lib/server-log";
import { getServerRequestContext } from "@/lib/server-request-context";

type SearchParamsInput = Record<string, string | string[] | undefined>;

export async function getGameHistoryOverviewPageData(
  searchParams: SearchParamsInput,
) {
  const requestContext = await getServerRequestContext();

  try {
    const user = await loadCurrentUser({
      onMissingAuth: "redirect",
      returnPath: "/game/history",
    });
    const data = await getGameHistoryOverviewPageDataCached(user.id, searchParams);

    logInfo("game_history.page_data.read.succeeded", {
      ...requestContext,
      userId: user.id,
      gameCount: data.games.length,
      friendCount: data.friends.length,
      gameTitleCount: data.gameTitles.length,
      statusFilter: data.filters.status,
      creatorFilter: data.filters.creator,
      outcomeFilter: data.filters.outcome,
      sortOrder: data.filters.sort,
      hasFriendFilter: Boolean(data.filters.friendUserId),
      hasGameTitleFilter: Boolean(data.filters.gameTitleId),
    });

    return {
      user,
      ...data,
    };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    logError("game_history.page_data.read.failed", error, {
      ...requestContext,
    });
    throw error;
  }
}

async function getGameHistoryOverviewPageDataCached(
  userId: string,
  searchParams: SearchParamsInput,
): Promise<GameHistoryPageCollections> {
  const cacheKey = JSON.stringify(searchParams);

  return unstable_cache(
    async () =>
      getGameHistoryPageCollections({
        userId,
        searchParams,
      }),
    [userId, cacheKey],
    {
      tags: [
        getGameHistoryTag(userId),
        getTitlesGlobalTag(),
        getProfileIdentityTag(),
      ],
    },
  )();
}
