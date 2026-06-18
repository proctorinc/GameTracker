import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PlayerRankSummaryCardProps = {
  title?: string;
  rankTotal: string | null;
  rankPosition: number | null;
  windowLabel: string | null;
  rankGamesCount: number | null;
  topThreeFinishes: number | null;
  twoPlayerPrizePool?: string | null;
  threePlayerPrizePool?: string | null;
  sixPlusPlayerPrizePool?: string | null;
  className?: string;
};

export function PlayerRankSummaryCard({
  title = "Player Rank",
  rankTotal,
  rankPosition,
  windowLabel,
  rankGamesCount,
  topThreeFinishes,
  twoPlayerPrizePool,
  threePlayerPrizePool,
  sixPlusPlayerPrizePool,
  className,
}: PlayerRankSummaryCardProps) {
  const gamesPlayed = rankGamesCount ?? 0;
  const podiumFinishes = topThreeFinishes ?? 0;
  const resolvedWindowLabel = windowLabel ?? "6-month rolling rank";

  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex">
              <p className="text-3xl font-black tracking-tight text-foreground">
                {Number(rankTotal).toFixed(0) ?? "0"}
              </p>
              <div className="flex size-9 shrink-0 items-center justify-center text-muted-foreground transition-colors">
                <Info className="size-4" />
              </div>
            </div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Player Rank
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-black tracking-tight text-foreground">
                {rankPosition ? `#${rankPosition}` : "--"}
              </p>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Global
              </p>
            </div>
          </div>
        </summary>
        <div className="space-y-4 border-t border-border/80 bg-muted/35 px-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">
              Your Player Rank reflects your top 3 finishes within the last{" "}
              {resolvedWindowLabel.replace(" rolling rank", "")} period. Keep
              playing to keep your rank.
            </p>
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
      </details>
    </Card>
  );
}
