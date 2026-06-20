"use client";

import {
  ActivityPageProvider,
} from "@/app/(protected)/activity/_components/activity-page-provider";
import { ActivityPageHeader } from "@/app/(protected)/activity/_components/sections/activity-page-header";
import { LeaderboardTabContent } from "@/app/(protected)/activity/_components/sections/leaderboard-tab-content";
import type { ActivityPageData } from "@/app/(protected)/activity/_components/page-data";

function AdminLeaderboardContent() {
  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4">
        <ActivityPageHeader />
        <LeaderboardTabContent />
      </div>
    </div>
  );
}

export function AdminLeaderboardPageView({
  data,
}: {
  data: ActivityPageData;
}) {
  return (
    <ActivityPageProvider data={data} initialTab="leaderboard">
      <AdminLeaderboardContent />
    </ActivityPageProvider>
  );
}
