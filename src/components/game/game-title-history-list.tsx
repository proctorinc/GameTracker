"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { PlayerRankDeltaBadge } from "@/components/player-rank/player-rank-delta-badge";
import ProfilePicture from "@/components/profile/profile-picture";
import { Button } from "@/components/ui/button";
import {
  sectionItemClassName,
  sectionItemMetaClassName,
  sectionItemTitleClassName,
} from "@/components/ui/section-styles";
import { CardEmpty } from "@/components/ui/card";
import type { GameTitleHistoryRow } from "@/lib/db/store/game.store";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 3;

function formatDate(value: string | null, prefix: string) {
  if (!value) {
    return prefix;
  }

  return `${prefix} ${new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

function formatScore(value: number | null) {
  return value === null ? "--" : value.toString();
}

function PlayerStack({
  players,
}: {
  players: GameTitleHistoryRow["players"];
}) {
  return (
    <div className="flex items-center">
      {players.map((player, index) => (
        <div
          key={player.id}
          className={cn("relative", index > 0 && "-ml-2")}
        >
          <ProfilePicture
            user={player}
            size="xs"
            className="ring-2 ring-background shadow-sm"
          />
        </div>
      ))}
    </div>
  );
}

export function GameTitleHistoryList({
  games,
  comparisonUserId,
}: {
  games: GameTitleHistoryRow[];
  comparisonUserId: string | null;
}) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [comparisonUserId, games.length]);

  if (games.length === 0) {
    return (
      <CardEmpty className="flex flex-col items-center gap-3 p-6">
        <p>No games played for this title yet.</p>
      </CardEmpty>
    );
  }

  const totalPages = Math.ceil(games.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(totalPages - 1, 0));
  const visibleGames = games.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <div className="flex flex-col gap-3">
      {visibleGames.map((game) => {
        const comparisonPlayer = comparisonUserId
          ? game.comparisonsByUserId[comparisonUserId] ?? null
          : null;

        return (
          <Link
            key={game.id}
            href={`/game/${game.id}/play`}
            className={cn(
              sectionItemClassName,
              "block rounded-[1.6rem] border-border/70 bg-card/95 px-4 py-3 transition-colors hover:bg-muted/75",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={cn(sectionItemTitleClassName, "font-bold")}>
                    {game.status === "completed" ? "Completed game" : "Active game"}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                      game.status === "completed"
                        ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/12 text-amber-700 dark:text-amber-300",
                    )}
                  >
                    {game.status === "completed" ? "Final" : "Live"}
                  </span>
                </div>
                <p className={cn(sectionItemMetaClassName, "mt-1")}>
                  {formatDate(
                    game.completedAt ?? game.createdAt,
                    game.completedAt ? "Completed" : "Started",
                  )}
                </p>
              </div>

              <div className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                <span>Open</span>
                <ArrowRight className="size-4" />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <PlayerStack players={game.players} />
              <span className={cn(sectionItemMetaClassName, "shrink-0")}>
                {game.playerCount} players
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {game.currentUser ? (
                <div className="rounded-2xl border border-border/70 bg-muted/45 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      You
                    </p>
                    {game.currentUser.rankDelta ? (
                      <PlayerRankDeltaBadge
                        delta={{
                          gameId: game.id,
                          userId: game.currentUser.userId,
                          deltaMinor: game.currentUser.rankDelta.minor,
                          deltaFormatted: game.currentUser.rankDelta.formatted,
                          completedAt: game.completedAt ?? game.createdAt,
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span>
                      <strong>{game.currentUser.placementLabel ?? "--"}</strong>
                    </span>
                    <span>Score {formatScore(game.currentUser.score)}</span>
                  </div>
                </div>
              ) : null}

              {comparisonPlayer ? (
                <div className="rounded-2xl border border-border/70 bg-muted/35 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {comparisonPlayer.displayName}
                    </p>
                    {comparisonPlayer.rankDelta ? (
                      <PlayerRankDeltaBadge
                        delta={{
                          gameId: game.id,
                          userId: comparisonPlayer.userId,
                          deltaMinor: comparisonPlayer.rankDelta.minor,
                          deltaFormatted: comparisonPlayer.rankDelta.formatted,
                          completedAt: game.completedAt ?? game.createdAt,
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span>
                      <strong>{comparisonPlayer.placementLabel ?? "--"}</strong>
                    </span>
                    <span>Score {formatScore(comparisonPlayer.score)}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                  Select a comparison player to see side-by-side game results.
                </div>
              )}
            </div>
          </Link>
        );
      })}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={currentPage === 0}
            onClick={() => setPage((value) => Math.max(value - 1, 0))}
          >
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            {currentPage + 1} / {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={currentPage >= totalPages - 1}
            onClick={() =>
              setPage((value) => Math.min(value + 1, totalPages - 1))
            }
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
