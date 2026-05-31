import { AuthUser } from "@/lib/auth";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  GameFull,
  GameTitleBase,
  listRecentCompletedGames,
  listRecentActiveGames,
  listRecentGameTitles,
} from "@/lib/db/store";
import { logError, logInfo } from "@/lib/server-log";
import { getServerRequestContext } from "@/lib/server-request-context";

export type DashboardPageData = {
  user: AuthUser;
  recentActiveGames: GameFull[];
  recentCompletedGames: GameFull[];
  recentGameTitles: GameTitleBase[];
  // cardDrops: CardDropFull[];
};

export async function getDashboardPageData(): Promise<DashboardPageData> {
  const requestContext = await getServerRequestContext();

  try {
    const user = await loadCurrentUser();
    const recentActiveGames = await listRecentActiveGames(user.id);
    const recentCompletedGames = await listRecentCompletedGames(user.id);
    const recentGameTitles = await listRecentGameTitles(user.id);

    logInfo("dashboard.page_data.read.succeeded", {
      ...requestContext,
      userId: user.id,
      recentActiveGameCount: recentActiveGames.length,
      recentCompletedGameCount: recentCompletedGames.length,
      recentGameTitleCount: recentGameTitles.length,
    });

    return {
      user,
      recentActiveGames,
      recentCompletedGames,
      recentGameTitles,
    };
  } catch (error) {
    logError("dashboard.page_data.read.failed", error, {
      ...requestContext,
    });
    throw error;
  }
}
