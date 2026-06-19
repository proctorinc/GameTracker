"use client";

import { useId, useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import Link from "next/link";
import ProfilePicture from "@/components/profile/profile-picture";
import { Card } from "@/components/ui/card";
import type { PlayerRankRecentChangeSummary } from "@/lib/db/store/player-rank.store";
import { cn } from "@/lib/utils";

export type PlayerRankSummaryCardProps = {
  title?: string;
  rankTotal: string | null;
  rankPosition: number | null;
  rankPositionLabel?: string;
  windowLabel: string | null;
  rankGamesCount: number | null;
  topThreeFinishes: number | null;
  recentChangeSummary?: PlayerRankRecentChangeSummary | null;
  twoPlayerPrizePool?: string | null;
  threePlayerPrizePool?: string | null;
  sixPlusPlayerPrizePool?: string | null;
  highlightedUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
    displayName?: string;
  } | null;
  className?: string;
};

export function PlayerRankSummaryCard({
  title = "Player Rank",
  rankTotal,
  rankPosition,
  rankPositionLabel = "Ranking",
  windowLabel,
  rankGamesCount,
  topThreeFinishes,
  recentChangeSummary,
  twoPlayerPrizePool,
  threePlayerPrizePool,
  sixPlusPlayerPrizePool,
  highlightedUser,
  className,
}: PlayerRankSummaryCardProps) {
  const detailsId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const gamesPlayed = rankGamesCount ?? 0;
  const podiumFinishes = topThreeFinishes ?? 0;
  const resolvedWindowLabel = windowLabel ?? "6-month rolling rank";
  const recentIncrease = recentChangeSummary?.recentIncrease ?? null;
  const recentDecrease = recentChangeSummary?.recentDecrease ?? null;
  const fallbackDisplayName =
    [highlightedUser?.firstName, highlightedUser?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || null;
  const displayName =
    highlightedUser?.displayName ?? fallbackDisplayName;
  const rankTotalLabel = rankTotal ? Number(rankTotal).toFixed(0) : "0";
  const detailCopy = displayName
    ? `${displayName}'s Player Rank reflects their top 3 finishes within the last ${resolvedWindowLabel.replace(" rolling rank", "")} period.`
    : `Your Player Rank reflects your top 3 finishes within the last ${resolvedWindowLabel.replace(" rolling rank", "")} period. Keep playing to keep your rank.`;

  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <button
        type="button"
        className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-5 pt-3 text-left"
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <div className="min-w-0 flex-1">
          {highlightedUser ? (
            <div className="mb-2 flex items-center gap-3">
              <ProfilePicture
                user={highlightedUser}
                size="sm"
                className="ring-2 ring-background shadow-sm"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {displayName}
                </p>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Highlighted Player
                </p>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-1">
            <p className="text-3xl font-black tracking-tight text-foreground">
              {rankTotalLabel}
            </p>
            <div className="flex size-9 shrink-0 items-center justify-center text-muted-foreground transition-colors">
              <Info className="size-4" />
            </div>
          </div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Player Rank
          </p>
        </div>
        <div className="text-right">
          <div className="min-w-0">
            <p className="text-2xl font-black tracking-tight text-foreground">
              {rankPosition ? `#${rankPosition}` : "--"}
            </p>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {rankPositionLabel}
            </p>
          </div>
        </div>
        <span className="pointer-events-none flex items-center self-center">
          <ChevronDown
            className={cn(
              "size-5 text-muted-foreground transition-transform duration-300 ease-out",
              isExpanded && "rotate-180",
            )}
          />
        </span>
      </button>
      <div
        id={detailsId}
        className={cn(
          "grid transition-all duration-300 ease-out",
          isExpanded
            ? "visible grid-rows-[1fr] opacity-100"
            : "invisible grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-border/80 bg-muted/35 px-4 py-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{detailCopy}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-border/70 bg-background/90 p-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Recent up
                </p>
                <p className="mt-1 text-xl font-black text-foreground">
                  {recentIncrease?.deltaFormatted ?? "--"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {recentIncrease
                    ? (recentChangeSummary?.recentWindowLabel ??
                      "Recent window")
                    : "No recent gain tracked"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/90 p-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Recent down
                </p>
                <p className="mt-1 text-xl font-black text-foreground">
                  {recentDecrease?.deltaFormatted ?? "--"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {recentDecrease
                    ? (recentChangeSummary?.recentWindowLabel ??
                      "Recent window")
                    : "No recent dip tracked"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-border/70 bg-background/90 p-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Games Played
                </p>
                <p className="mt-1 text-xl font-black text-foreground">
                  {gamesPlayed}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/90 p-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Top 3 Finishes
                </p>
                <p className="mt-1 text-xl font-black text-foreground">
                  {podiumFinishes}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Increase your rank
              </p>
              <p className="text-sm text-muted-foreground">
                Only top-3 finishes earn points. Larger reward for 1st place and
                larger reward pools for playing with more friends.
              </p>
            </div>
            <Link
              href="/player-rank"
              className="inline-flex text-sm font-semibold text-primary transition-colors hover:text-primary/80"
            >
              View full standings
            </Link>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-border/70 bg-background/90 p-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  2 players
                </p>
                <p className="mt-1 text-xl font-black text-foreground">
                  {twoPlayerPrizePool ?? "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/90 p-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  3 players
                </p>
                <p className="mt-1 text-xl font-black text-foreground">
                  {threePlayerPrizePool ?? "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/90 p-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  6+ players
                </p>
                <p className="mt-1 text-xl font-black text-foreground">
                  {sixPlusPlayerPrizePool ?? "--"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
