import type { ProfileStatsPageData } from "../../profile-types";

export type ProfileOverviewUser = {
  id: string;
  role: "user" | "admin";
  firstName: string | null;
  lastName: string | null;
  color: string;
  phoneNumber: string | null;
  createdAt: string | null;
};

export type ProfileOverviewPageData = {
  user: ProfileOverviewUser;
  profile: ProfileStatsPageData["profile"];
  canViewPlayerRank: boolean;
  playerRankTotal: string | null;
  playerRankPosition: number | null;
  playerRankWindowLabel: string | null;
  playerRankGamesCount: number | null;
  topThreeFinishes: number | null;
  twoPlayerPrizePool: string | null;
  threePlayerPrizePool: string | null;
  sixPlusPlayerPrizePool: string | null;
  defaultBestFriend: ProfileStatsPageData["defaultBestFriend"];
  stats: ProfileStatsPageData["stats"];
  comparisonOptions: ProfileStatsPageData["comparisonOptions"];
  comparisonSummariesByUserId: ProfileStatsPageData["comparisonSummariesByUserId"];
  defaultComparisonUserId: ProfileStatsPageData["defaultComparisonUserId"];
};
