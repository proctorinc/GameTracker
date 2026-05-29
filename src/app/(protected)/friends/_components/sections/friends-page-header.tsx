"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFriendsPage } from "../friends-page-provider";

export function FriendsPageHeader() {
  const { isPending, setIsInviteDialogOpen } = useFriendsPage();

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-4xl font-black">My Friends</h1>
      <Button
        size="icon-sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => setIsInviteDialogOpen(true)}
      >
        <Plus />
        <span className="sr-only">Invite friend</span>
      </Button>
    </div>
  );
}
