import type {
  ProfileStatsBestFriend,
  ProfileStatsComparisonOption,
  ProfileStatsComparisonSummary,
  ProfileStatsSummary,
} from "@/lib/profile-stats";
import type { PlayerRankRecentChangeSummary } from "@/lib/db/store/player-rank.store";

export type PublicProfileSummaryData = {
  profile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
    avatarUrl: string | null;
    createdAt: string | null;
    displayName: string;
  };
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
  defaultBestFriend: ProfileStatsBestFriend | null;
  stats: ProfileStatsSummary;
};

export type ProfileStatsPageData = PublicProfileSummaryData & {
  comparisonOptions: ProfileStatsComparisonOption[];
  comparisonSummariesByUserId: Record<string, ProfileStatsComparisonSummary>;
  defaultComparisonUserId: string | null;
};
