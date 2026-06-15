import type {
  ProfileStatsBestFriend,
  ProfileStatsComparisonOption,
  ProfileStatsComparisonSummary,
  ProfileStatsSignatureTitle,
  ProfileStatsStoryline,
  ProfileStatsStreak,
} from "@/lib/profile-stats";

export type PublicProfileSummaryData = {
  profile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
    createdAt: string | null;
    displayName: string;
  };
  defaultBestFriend: ProfileStatsBestFriend | null;
  stats: {
    friendCount: number;
    completedGames: number;
    wins: number;
    winRate: number | null;
    bestFriendGames: number;
    bestWinStreak: number;
    currentStreak: ProfileStatsStreak;
    storyline: ProfileStatsStoryline;
    signatureTitle: ProfileStatsSignatureTitle | null;
    lastPlayedAt: string | null;
  };
};

export type ProfileStatsPageData = PublicProfileSummaryData & {
  comparisonOptions: ProfileStatsComparisonOption[];
  comparisonSummariesByUserId: Record<string, ProfileStatsComparisonSummary>;
  defaultComparisonUserId: string | null;
};
