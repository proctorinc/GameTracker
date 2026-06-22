"use client";

import { useActivityPage } from "../activity-page-provider";

export function ActivityPageHeader() {
  const { activeTab } = useActivityPage();
  const title = activeTab === "leaderboard" ? "Leaderboard" : "Activity";

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">{title}</h1>
        </div>
      </div>
    </div>
  );
}
