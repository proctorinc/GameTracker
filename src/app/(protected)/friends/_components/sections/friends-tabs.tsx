"use client";

import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFriendsPage } from "../friends-page-provider";

export function FriendsTabs() {
  const { activeTab, setActiveTab } = useFriendsPage();

  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-muted/70 p-1">
      <Button
        variant={activeTab === "friends" ? "default" : "ghost"}
        className="rounded-xl"
        size="sm"
        onClick={() => setActiveTab("friends")}
      >
        <Users />
        My friends
      </Button>
      <Button
        variant={activeTab === "invitations" ? "default" : "ghost"}
        className="rounded-xl"
        size="sm"
        onClick={() => setActiveTab("invitations")}
      >
        <UserPlus />
        Invitations
      </Button>
    </div>
  );
}
