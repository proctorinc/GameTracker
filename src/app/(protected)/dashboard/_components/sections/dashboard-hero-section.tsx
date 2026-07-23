"use client";

import { PlayerRankSummaryCard } from "@/components/player-rank/player-rank-summary-card";
import { AnnouncementModal } from "@/components/announcements/announcement-modal";
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
    recentAnnouncements,
  } = useDashboardPage();

  return (
    <div className="space-y-4 px-3">
      <div className="flex items-center justify-between gap-3 pl-2">
        <h1 className="text-4xl font-black">Hi, {user.firstName}!</h1>
        <AnnouncementModal
          announcements={recentAnnouncements}
          mode="recent"
        />
      </div>
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
