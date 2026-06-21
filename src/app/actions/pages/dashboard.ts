import { AuthUser } from "@/lib/auth";
import {
  GameFull,
  GameTitleBase,
  InvitationFull,
  listIncomingInvitationsForUser,
  listRecentCompletedGames,
  listRecentActiveGames,
  listRecentGameTitles,
} from "@/lib/db/store";
import type {
  PlayerRankGameDelta,
  PlayerRankRecentChangeSummary,
} from "@/lib/db/store/player-rank.store";

export type DashboardCompletedGame = GameFull & {
  currentUserRankDelta: PlayerRankGameDelta | null;
};

export type DashboardPageData = {
  user: AuthUser;
  incomingInvitations: InvitationFull[];
  recentActiveGames: GameFull[];
  recentCompletedGames: DashboardCompletedGame[];
  recentGameTitles: GameTitleBase[];
  canViewPlayerRank: boolean;
  playerRankTotal: string | null;
  playerRankPosition: number | null;
  playerRankWindowLabel: string | null;
  playerRankGamesCount: number | null;
  topThreeFinishes: number | null;
  playerRankRecentChangeSummary: PlayerRankRecentChangeSummary | null;
  twoPlayerPrizePool: string | null;
  threePlayerPrizePool: string | null;
  sixPlusPlayerPrizePool: string | null;
  // cardDrops: CardDropFull[];
};

export type DashboardPageCollections = Pick<
  {
    incomingInvitations: InvitationFull[];
    recentActiveGames: GameFull[];
    recentCompletedGames: GameFull[];
    recentGameTitles: GameTitleBase[];
  },
  | "incomingInvitations"
  | "recentActiveGames"
  | "recentCompletedGames"
  | "recentGameTitles"
>;

export async function getDashboardPageCollections(input: {
  userId: string;
}): Promise<DashboardPageCollections> {
  const [
    incomingInvitations,
    recentActiveGames,
    recentCompletedGames,
    recentGameTitles,
  ] =
    await Promise.all([
      listIncomingInvitationsForUser({
        userId: input.userId,
      }),
      listRecentActiveGames(input.userId),
      listRecentCompletedGames(input.userId),
      listRecentGameTitles(input.userId),
    ]);

  return {
    incomingInvitations,
    recentActiveGames,
    recentCompletedGames,
    recentGameTitles,
  };
}
