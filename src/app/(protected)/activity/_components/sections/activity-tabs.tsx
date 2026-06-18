"use client";

import { AudioLines, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivityPage } from "../activity-page-provider";

export function ActivityTabs() {
  const { activeTab, setActiveTab } = useActivityPage();

  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-muted/70 p-1">
      <Button
        variant={activeTab === "activity" ? "default" : "ghost"}
        className="rounded-xl"
        size="sm"
        onClick={() => setActiveTab("activity")}
      >
        <AudioLines />
        Activity
      </Button>
      <Button
        variant={activeTab === "leaderboard" ? "default" : "ghost"}
        className="rounded-xl"
        size="sm"
        onClick={() => setActiveTab("leaderboard")}
      >
        <Trophy />
        Leaderboard
      </Button>
    </div>
  );
}
