"use client";

import { Link2, Share2, UserPlus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useFriendsPage } from "../friends-page-provider";

export function AddFriendCard() {
  const { handleCreateInviteLink, handleSharePublicProfile, isPending } =
    useFriendsPage();

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>Share</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2">
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
                  <p className="text-sm font-medium">Share your profile</p>
                  <p className="text-xs text-muted-foreground">
                    Send your public profile to a friend
                  </p>
                </div>
              </div>
              <Share2 className="size-4 text-muted-foreground" />
            </span>
          </button>
          <button
            type="button"
            className="group w-full rounded-2xl border border-border bg-muted/60 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={() => handleCreateInviteLink()}
          >
            <span className="flex w-full items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
                  <Link2 className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Share invitation link</p>
                  <p className="text-xs text-muted-foreground">
                    Send a shareable invitation link
                  </p>
                </div>
              </div>
              <UserPlus className="size-4 text-muted-foreground" />
            </span>
          </button>
        </div>
      </CardHeader>
    </Card>
  );
}
