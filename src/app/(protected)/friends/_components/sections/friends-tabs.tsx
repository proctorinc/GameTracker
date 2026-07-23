"use client";

import { AudioLines, Users } from "lucide-react";
import {
  TabSelector,
  TabSelectorButton,
} from "@/components/ui/tab-selector";
import { useFriendsPage } from "../friends-page-provider";

export function FriendsTabs() {
  const {
    activeTab,
    data: { incomingInvitations },
    setActiveTab,
  } = useFriendsPage();
  const hasPendingInvitations = incomingInvitations.length > 0;

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
        active={activeTab === "friends"}
        className="relative rounded-xl"
        onClick={() => setActiveTab("friends")}
      >
        {hasPendingInvitations ? (
          <span className="absolute right-2 top-2 size-2.5 rounded-full bg-red-500" />
        ) : null}
        <Users />
        Friends
      </TabSelectorButton>
    </TabSelector>
  );
}
