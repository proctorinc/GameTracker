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
  canViewPlayerRank: boolean;
  playerRankTotal: string | null;
  playerRankPosition: number | null;
  playerRankWindowLabel: string | null;
  playerRankGamesCount: number | null;
  topThreeFinishes: number | null;
  twoPlayerPrizePool: string | null;
  threePlayerPrizePool: string | null;
  sixPlusPlayerPrizePool: string | null;
  // cardDrops: CardDropFull[];
};

export type DashboardPageCollections = Pick<
  DashboardPageData,
  "recentActiveGames" | "recentCompletedGames" | "recentGameTitles"
>;

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
