"use client";

import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerRankStandingRow } from "@/lib/db/store/player-rank.store";
import { cn } from "@/lib/utils";

type PlayerRankStandingsListProps = {
  currentUserId?: string | null;
  standings: PlayerRankStandingRow[];
};

function getDisplayName(row: Pick<PlayerRankStandingRow, "displayName">) {
  return row.displayName || "Skybo Player";
}

export function PlayerRankStandingsList({
  currentUserId,
  standings,
}: PlayerRankStandingsListProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-black">Global standings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {standings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            No Player Rank standings are available yet.
          </div>
        ) : (
          standings.map((row) => {
            const isCurrentUser = row.userId === currentUserId;

            return (
              <div
                key={row.userId}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-border/70 bg-card/95 px-3 py-3",
                  isCurrentUser && "border-primary/40 bg-primary/5",
                )}
              >
                <div className="flex w-11 shrink-0 items-center justify-center">
                  <span className="text-lg font-black text-muted-foreground">
                    {row.playerRankPosition ? `#${row.playerRankPosition}` : "--"}
                  </span>
                </div>
                <ProfilePicture
                  size="sm"
                  user={{
                    id: row.userId,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    color: "#FFFFFF",
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
                    Rank
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
