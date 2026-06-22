"use client";

import {
  ActivityPageProvider,
  useActivityPage,
} from "./activity-page-provider";
import type { ActivityPageData } from "./page-data";
import { FriendActivityCard } from "./sections/friend-activity-card";
import { ActivityPageHeader } from "./sections/activity-page-header";
import { ActivityTabs } from "./sections/activity-tabs";
import { LeaderboardTabContent } from "./sections/leaderboard-tab-content";
import { PlayerRankTrendCard } from "@/components/player-rank/player-rank-trend-card";

function ActivityPageContent() {
  const { data, activeTab } = useActivityPage();

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4">
        <ActivityPageHeader />
        {data.playerRankTrend && (
          <PlayerRankTrendCard
            href="/player-rank"
            user={data.user}
            color={data.user.color}
            rankPosition={data.playerRankTrend.rankPosition}
            rankTotal={data.playerRankTrend.rankTotal}
            chartPoints={data.playerRankTrend.chartPoints}
            hasHistory={data.playerRankTrend.hasHistory}
          />
        )}
        <ActivityTabs />
        {activeTab === "activity" ? (
          <FriendActivityCard />
        ) : (
          <LeaderboardTabContent />
        )}
      </div>
    </div>
  );
}

export function ActivityPageView({
  data,
  initialTab,
}: {
  data: ActivityPageData;
  initialTab: "activity" | "leaderboard";
}) {
  return (
    <ActivityPageProvider data={data} initialTab={initialTab}>
      <ActivityPageContent />
    </ActivityPageProvider>
  );
}
