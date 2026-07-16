import "server-only";

import { unstable_cache } from "next/cache";
import {
  type TitlesPageCollections,
  getTitlesPageCollections,
} from "@/app/actions/pages/titles";
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

export async function getTitlesOverviewPageData(searchParams: SearchParamsInput) {
  const requestContext = await getServerRequestContext();

  try {
    const user = await loadCurrentUser({
      onMissingAuth: "redirect",
      returnPath: "/titles",
    });
    const data = await getTitlesOverviewPageDataCached(user.id, searchParams);

    logInfo("titles.page_data.read.succeeded", {
      ...requestContext,
      userId: user.id,
      gameTitleCount: data.gameTitles.length,
      scopeFilter: data.filters.scope,
      sourceFilter: data.filters.source,
      sortOrder: data.filters.sort,
      hasQuery: Boolean(data.filters.query),
      ownedCount: data.counts.mine,
      universalCount: data.counts.universal,
    });

    return {
      user,
      ...data,
    };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    logError("titles.page_data.read.failed", error, {
      ...requestContext,
    });
    throw error;
  }
}

async function getTitlesOverviewPageDataCached(
  userId: string,
  searchParams: SearchParamsInput,
): Promise<TitlesPageCollections> {
  const cacheKey = JSON.stringify(searchParams);

  return unstable_cache(
    async () =>
      getTitlesPageCollections({
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
