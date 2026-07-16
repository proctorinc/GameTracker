"use client";

import { AudioLines, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFriendsPage } from "../friends-page-provider";

export function FriendsTabs() {
  const {
    activeTab,
    data: { incomingInvitations },
    setActiveTab,
  } = useFriendsPage();
  const hasPendingInvitations = incomingInvitations.length > 0;

  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-muted/70 p-1">
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
        variant={activeTab === "friends" ? "default" : "ghost"}
        className="relative rounded-xl"
        size="sm"
        onClick={() => setActiveTab("friends")}
      >
        {hasPendingInvitations ? (
          <span className="absolute right-2 top-2 size-2.5 rounded-full bg-red-500" />
        ) : null}
        <Users />
        Friends
      </Button>
    </div>
  );
}
