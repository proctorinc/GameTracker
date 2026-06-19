"use client";

import Link from "next/link";
import { ChevronRight, Trophy, Users } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export function ViewFriendsCard() {
  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>View Friends</CardTitle>
        <Link
          href="/activity?tab=leaderboard"
          className="group w-full rounded-2xl border border-border bg-muted/60 text-left transition-colors hover:bg-muted"
        >
          <span className="flex w-full items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
                <Users className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Open friends leaderboard</p>
                <p className="text-xs text-muted-foreground">
                  See your friends on the activity leaderboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="size-4" />
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </span>
        </Link>
      </CardHeader>
    </Card>
  );
}
