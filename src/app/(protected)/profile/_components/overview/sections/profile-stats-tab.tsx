"use client";

import { useProfileOverview } from "../profile-overview-provider";
import { ProfileStatsSections } from "../../profile-stats-sections";

export function ProfileStatsTab() {
  const { data } = useProfileOverview();

  return (
    <ProfileStatsSections
      data={{
        profile: data.profile,
        defaultBestFriend: data.defaultBestFriend,
        stats: data.stats,
        comparisonOptions: data.comparisonOptions,
        comparisonSummariesByUserId: data.comparisonSummariesByUserId,
        defaultComparisonUserId: data.defaultComparisonUserId,
      }}
    />
  );
}
