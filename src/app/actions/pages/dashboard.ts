import { AuthUser } from "@/lib/auth";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  GameFull,
  GameTitleBase,
  listRecentCompletedGames,
  listRecentActiveGames,
  listRecentGameTitles,
} from "@/lib/db/store";

export type DashboardPageData = {
  user: AuthUser;
  recentActiveGames: GameFull[];
  recentCompletedGames: GameFull[];
  recentGameTitles: GameTitleBase[];
  // cardDrops: CardDropFull[];
};

export async function getDashboardPageData(): Promise<DashboardPageData> {
  const user = await loadCurrentUser();
  const recentActiveGames = await listRecentActiveGames(user.id);
  const recentCompletedGames = await listRecentCompletedGames(user.id);
  const recentGameTitles = await listRecentGameTitles(user.id);

  return {
    user,
    recentActiveGames,
    recentCompletedGames,
    recentGameTitles,
  };
}
