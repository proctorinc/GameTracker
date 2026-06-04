"use client";

import { AudioLines, Mail, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFriendsPage } from "../friends-page-provider";

export function FriendsTabs() {
  const { activeTab, setActiveTab } = useFriendsPage();

  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-muted/70 p-1">
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
        className="rounded-xl"
        size="sm"
        onClick={() => setActiveTab("friends")}
      >
        <Users />
        Friends
      </Button>
      <Button
        variant={activeTab === "invitations" ? "default" : "ghost"}
        className="rounded-xl"
        size="sm"
        onClick={() => setActiveTab("invitations")}
      >
        <Mail />
        Invites
      </Button>
    </div>
  );
}
