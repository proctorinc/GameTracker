import { AuthUser } from "@/lib/auth";
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

export type DashboardPageCollections = Omit<DashboardPageData, "user">;

export async function getDashboardPageCollections(input: {
  userId: string;
}): Promise<DashboardPageCollections> {
  const [recentActiveGames, recentCompletedGames, recentGameTitles] =
    await Promise.all([
      listRecentActiveGames(input.userId),
      listRecentCompletedGames(input.userId),
      listRecentGameTitles(input.userId),
    ]);

  return {
    recentActiveGames,
    recentCompletedGames,
    recentGameTitles,
  };
}
