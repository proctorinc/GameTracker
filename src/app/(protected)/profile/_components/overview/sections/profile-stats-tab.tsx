"use client";

import { useProfileOverview } from "../profile-overview-provider";
import { ProfileStatsSections } from "../../profile-stats-sections";
import { ProfileHeroCard } from "./profile-hero-card";

export function ProfileStatsTab() {
  const { data } = useProfileOverview();

  return (
    <ProfileStatsSections
      data={{
        profile: data.profile,
        canViewPlayerRank: data.canViewPlayerRank,
        playerRankTotal: data.playerRankTotal,
        playerRankPosition: data.playerRankPosition,
        playerRankWindowLabel: data.playerRankWindowLabel,
        playerRankGamesCount: data.playerRankGamesCount,
        topThreeFinishes: data.topThreeFinishes,
        playerRankRecentChangeSummary: data.playerRankRecentChangeSummary,
        twoPlayerPrizePool: data.twoPlayerPrizePool,
        threePlayerPrizePool: data.threePlayerPrizePool,
        sixPlusPlayerPrizePool: data.sixPlusPlayerPrizePool,
        defaultBestFriend: data.defaultBestFriend,
        stats: data.stats,
        comparisonOptions: data.comparisonOptions,
        comparisonSummariesByUserId: data.comparisonSummariesByUserId,
        defaultComparisonUserId: data.defaultComparisonUserId,
      }}
    />
  );
}
