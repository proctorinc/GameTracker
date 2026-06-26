import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PlayerRankChartPoint } from "@/lib/db/store/player-rank.store";
import { Card } from "@/components/ui/card";
import { PlayerRankSummaryChart } from "./player-rank-summary-chart";
import RankToken from "./RankToken";

type PlayerRankTrendCardProps = {
  href: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
  };
  color: string;
  rankTotal: string | null;
  rankPosition: number | null;
  chartPoints: PlayerRankChartPoint[];
  hasHistory: boolean;
};

export function PlayerRankTrendCard({
  href,
  user,
  color,
  rankTotal,
  chartPoints,
  hasHistory,
}: PlayerRankTrendCardProps) {
  const rankTotalLabel = rankTotal ? `${Math.floor(Number(rankTotal))}` : "--";

  return (
    <Link href={href} className="block">
      <Card className="relative gap-0 border-border/70 bg-card/95 px-4 pt-4 transition-transform hover:scale-[1.01]">
        <div className="flex items-start px-2 justify-between gap-3">
          <div className="flex gap-2">
            {/*<div className="pb-0.5 text-xs text-muted-foreground">
              {rankPosition ? `#${rankPosition}` : "--"}
            </div>*/}
            <div className="space-y-0.5">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Your Rank
              </p>
              <div className="flex gap-1 items-center">
                <p className="text-3xl font-black tracking-tight">
                  {rankTotalLabel}
                </p>
                <RankToken />
              </div>
            </div>
          </div>
          <div className="flex py-2 items-center gap-1 text-[0.7rem] font-semibold text-muted-foreground">
            <span>Compare</span>
            <ArrowRight className="size-4" />
          </div>
        </div>
        <PlayerRankSummaryChart
          className="h-14 w-full -mx-3"
          color={color}
          emptyMessage="No rank history yet"
          points={chartPoints}
          user={user}
        />
        {!hasHistory ? (
          <p className="text-xs text-muted-foreground">
            Finish ranked games to start your trend.
          </p>
        ) : null}
      </Card>
    </Link>
  );
}
