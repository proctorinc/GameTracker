"use client";

import { BarChart3, Layers3, Users } from "lucide-react";
import {
  TabSelector,
  TabSelectorButton,
} from "@/components/ui/tab-selector";
import { useProfileOverview } from "../profile-overview-provider";

export function ProfileOverviewTabs() {
  const {
    activeTab,
    data: { cardsEnabled, hasPendingFriendInvitations },
    setActiveTab,
  } = useProfileOverview();

  return (
    <TabSelector
      className={cardsEnabled === false ? "grid-cols-2" : "grid-cols-3"}
    >
      <TabSelectorButton
        active={activeTab === "stats"}
        onClick={() => setActiveTab("stats")}
      >
        <BarChart3 />
        Stats
      </TabSelectorButton>
      {cardsEnabled !== false ? (
        <TabSelectorButton
          active={activeTab === "collection"}
          onClick={() => setActiveTab("collection")}
        >
          <Layers3 />
          Cards
        </TabSelectorButton>
      ) : null}
      <TabSelectorButton
        active={activeTab === "friends"}
        className="relative rounded-xl"
        onClick={() => setActiveTab("friends")}
      >
        {hasPendingFriendInvitations ? (
          <span className="absolute right-2 top-2 size-2.5 rounded-full bg-red-500" />
        ) : null}
        <Users />
        Friends
      </TabSelectorButton>
      {/*<Button
        variant={activeTab === "settings" ? "default" : "ghost"}
        className="rounded-xl"
        size="sm"
        onClick={() => setActiveTab("settings")}
      >
        <Settings />
        Settings
      </Button>*/}
    </TabSelector>
  );
}
