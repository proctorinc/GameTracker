import "server-only";

import { unstable_cache } from "next/cache";
import { getDashboardPageCollections } from "@/app/actions/pages/dashboard";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import { getDashboardTag } from "@/lib/cache-tags";
import { logError, logInfo } from "@/lib/server-log";
import { getServerRequestContext } from "@/lib/server-request-context";

const DASHBOARD_PAGE_REVALIDATE_SECONDS = 15;

export async function getDashboardOverviewPageData() {
  const requestContext = await getServerRequestContext();

  try {
    const user = await loadCurrentUser();
    const data = await getDashboardOverviewPageDataCached(user.id);

    logInfo("dashboard.page_data.read.succeeded", {
      ...requestContext,
      userId: user.id,
      recentActiveGameCount: data.recentActiveGames.length,
      recentCompletedGameCount: data.recentCompletedGames.length,
      recentGameTitleCount: data.recentGameTitles.length,
    });

    return {
      user,
      ...data,
    };
  } catch (error) {
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
      tags: [getDashboardTag(userId)],
      revalidate: DASHBOARD_PAGE_REVALIDATE_SECONDS,
    },
  )();
}
