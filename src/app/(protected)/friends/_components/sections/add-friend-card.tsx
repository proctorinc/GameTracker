"use client";

import { Share2, UserPlus } from "lucide-react";
import { useFriendsPage } from "../friends-page-provider";

export function AddFriendCard() {
  const { handleSharePublicProfile, isPending } = useFriendsPage();

  return (
    <button
      type="button"
      className="group w-full rounded-2xl border border-border bg-muted/60 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
      onClick={() => {
        void handleSharePublicProfile();
      }}
    >
      <span className="flex w-full items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
            <UserPlus className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Share with friends</p>
            <p className="text-xs text-muted-foreground">
              Send your public profile for them to friend you
            </p>
          </div>
        </div>
        <Share2 className="size-4 text-muted-foreground" />
      </span>
    </button>
  );
}
