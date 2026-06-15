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
  defaultBestFriend: ProfileStatsPageData["defaultBestFriend"];
  stats: ProfileStatsPageData["stats"];
  comparisonOptions: ProfileStatsPageData["comparisonOptions"];
  comparisonSummariesByUserId: ProfileStatsPageData["comparisonSummariesByUserId"];
  defaultComparisonUserId: ProfileStatsPageData["defaultComparisonUserId"];
};
