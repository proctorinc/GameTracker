"use client";

import type { ActivityLeaderboardFriend } from "@/app/(protected)/activity/_components/leaderboard-utils";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PlayerRankStandingsListProps = {
  currentUserId?: string | null;
  standings: ActivityLeaderboardFriend[];
};

function getDisplayName(row: ActivityLeaderboardFriend) {
  return [row.user.firstName, row.user.lastName].filter(Boolean).join(" ").trim() || "Skybo Player";
}

export function PlayerRankStandingsList({
  currentUserId,
  standings,
}: PlayerRankStandingsListProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-black">Friends standings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {standings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            Add friends to see your Player Rank circle.
          </div>
        ) : (
          standings.map((row) => {
            const isCurrentUser = row.user.id === currentUserId;

            return (
              <div
                key={row.user.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border/70 bg-card/95 px-3 py-3",
                  isCurrentUser && "border-primary/40 bg-primary/5",
                )}
              >
                <div className="flex w-11 shrink-0 items-center justify-center">
                  <span className="text-lg font-black text-muted-foreground">
                    #{row.friendPosition}
                  </span>
                </div>
                <ProfilePicture
                  size="sm"
                  user={{
                    id: row.user.id,
                    firstName: row.user.firstName,
                    lastName: row.user.lastName,
                    color: row.user.color,
                    avatarUrl: row.user.avatarUrl,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{getDisplayName(row)}</p>
                    {isCurrentUser ? <Badge variant="outline">You</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {row.playerRankGamesCount} ranked game
                    {row.playerRankGamesCount === 1 ? "" : "s"} tracked
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black">{row.playerRankTotal}</p>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Player Rank
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
