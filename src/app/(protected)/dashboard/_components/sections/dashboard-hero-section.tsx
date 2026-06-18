"use client";

import { PlayerRankSummaryCard } from "@/components/player-rank/player-rank-summary-card";
import { useDashboardPage } from "../dashboard-page-provider";

export function DashboardHeroSection() {
  const {
    user,
    canViewPlayerRank,
    playerRankGamesCount,
    playerRankPosition,
    playerRankRecentChangeSummary,
    playerRankTotal,
    playerRankWindowLabel,
    topThreeFinishes,
    twoPlayerPrizePool,
    threePlayerPrizePool,
    sixPlusPlayerPrizePool,
  } = useDashboardPage();

  return (
    <div className="space-y-4 px-3">
      <h1 className="text-4xl font-black pl-2">Hi, {user.firstName}!</h1>
      {canViewPlayerRank ? (
        <PlayerRankSummaryCard
          rankGamesCount={playerRankGamesCount}
          rankPosition={playerRankPosition}
          recentChangeSummary={playerRankRecentChangeSummary}
          rankTotal={playerRankTotal}
          topThreeFinishes={topThreeFinishes}
          windowLabel={playerRankWindowLabel}
          twoPlayerPrizePool={twoPlayerPrizePool}
          threePlayerPrizePool={threePlayerPrizePool}
          sixPlusPlayerPrizePool={sixPlusPlayerPrizePool}
          className="mr-1"
        />
      ) : null}
    </div>
  );
}
