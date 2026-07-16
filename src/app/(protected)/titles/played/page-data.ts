import "server-only";

import { unstable_cache } from "next/cache";
import {
  type PlayedTitlesPageCollections,
  getPlayedTitlesPageCollections,
} from "@/app/actions/pages/played-titles";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  getProfileIdentityTag,
  getTitlesGlobalTag,
  getTitlesTag,
} from "@/lib/cache-tags";
import { isNextRedirectError } from "@/lib/next-navigation-errors";
import { logError, logInfo } from "@/lib/server-log";
import { getServerRequestContext } from "@/lib/server-request-context";

type SearchParamsInput = Record<string, string | string[] | undefined>;

export async function getPlayedTitlesOverviewPageData(
  searchParams: SearchParamsInput,
) {
  const requestContext = await getServerRequestContext();

  try {
    const user = await loadCurrentUser({
      onMissingAuth: "redirect",
      returnPath: "/titles/played",
    });
    const data = await getPlayedTitlesOverviewPageDataCached(user.id, searchParams);

    logInfo("played_titles.page_data.read.succeeded", {
      ...requestContext,
      userId: user.id,
      gameTitleCount: data.gameTitles.length,
      hasQuery: Boolean(data.filters.query),
    });

    return {
      user,
      ...data,
    };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    logError("played_titles.page_data.read.failed", error, {
      ...requestContext,
    });
    throw error;
  }
}

async function getPlayedTitlesOverviewPageDataCached(
  userId: string,
  searchParams: SearchParamsInput,
): Promise<PlayedTitlesPageCollections> {
  const cacheKey = JSON.stringify(searchParams);

  return unstable_cache(
    async () =>
      getPlayedTitlesPageCollections({
        userId,
        searchParams,
      }),
    [userId, cacheKey],
    {
      tags: [
        getTitlesTag(userId),
        getTitlesGlobalTag(),
        getProfileIdentityTag(),
      ],
    },
  )();
}
