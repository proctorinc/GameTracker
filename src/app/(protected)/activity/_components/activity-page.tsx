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

function ActivityPageContent() {
  const { activeTab } = useActivityPage();

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4">
        <ActivityPageHeader />
        <ActivityTabs />
        {activeTab === "activity" ? (
          <div className="flex flex-1 flex-col">
            <FriendActivityCard />
          </div>
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
