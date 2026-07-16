"use client";

import { BarChart3, Layers3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfileOverview } from "../profile-overview-provider";

export function ProfileOverviewTabs() {
  const {
    activeTab,
    data: { cardsEnabled, hasPendingFriendInvitations },
    setActiveTab,
  } = useProfileOverview();

  return (
    <div className={`grid gap-2 rounded-xl border border-border/70 bg-muted/70 p-1 ${cardsEnabled === false ? "grid-cols-2" : "grid-cols-3"}`}>
      <Button
        variant={activeTab === "stats" ? "default" : "ghost"}
        className="rounded-xl"
        size="sm"
        onClick={() => setActiveTab("stats")}
      >
        <BarChart3 />
        Stats
      </Button>
      {cardsEnabled !== false ? (
        <Button
          variant={activeTab === "collection" ? "default" : "ghost"}
          className="rounded-xl"
          size="sm"
          onClick={() => setActiveTab("collection")}
        >
          <Layers3 />
          Cards
        </Button>
      ) : null}
      <Button
        variant={activeTab === "friends" ? "default" : "ghost"}
        className="relative rounded-xl"
        size="sm"
        onClick={() => setActiveTab("friends")}
      >
        {hasPendingFriendInvitations ? (
          <span className="absolute right-2 top-2 size-2.5 rounded-full bg-red-500" />
        ) : null}
        <Users />
        Friends
      </Button>
      {/*<Button
        variant={activeTab === "settings" ? "default" : "ghost"}
        className="rounded-xl"
        size="sm"
        onClick={() => setActiveTab("settings")}
      >
        <Settings />
        Settings
      </Button>*/}
    </div>
  );
}
