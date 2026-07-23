"use client";

import { AudioLines, Trophy } from "lucide-react";
import {
  TabSelector,
  TabSelectorButton,
} from "@/components/ui/tab-selector";
import { useActivityPage } from "../activity-page-provider";

export function ActivityTabs() {
  const { activeTab, setActiveTab } = useActivityPage();

  return (
    <TabSelector className="grid-cols-2">
      <TabSelectorButton
        active={activeTab === "activity"}
        onClick={() => setActiveTab("activity")}
      >
        <AudioLines />
        Activity
      </TabSelectorButton>
      <TabSelectorButton
        active={activeTab === "leaderboard"}
        onClick={() => setActiveTab("leaderboard")}
      >
        <Trophy />
        Leaderboard
      </TabSelectorButton>
    </TabSelector>
  );
}
