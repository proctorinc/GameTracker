"use client";

import { useProfileOverview } from "../profile-overview-provider";
import { ProfileStatsSections } from "../../profile-stats-sections";

export function ProfileStatsTab() {
  const { data } = useProfileOverview();

  return (
    <ProfileStatsSections
      data={{
        profile: data.profile,
        bestFriend: data.bestFriend,
        stats: data.stats,
      }}
    />
  );
}
