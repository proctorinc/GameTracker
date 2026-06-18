import { PlayerRankSummaryCard } from "@/components/player-rank/player-rank-summary-card";
import { PlayerRankStandingsList } from "@/components/player-rank/player-rank-standings-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerRankPageData } from "./page-data";

export function PlayerRankPageView({ data }: { data: PlayerRankPageData }) {
  if (!data.canViewPlayerRank) {
    return (
      <div className="min-h-screen overflow-y-auto px-4 pb-40">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-black">Player Rank</h1>
            <p className="text-sm text-muted-foreground">
              Player Rank is waiting on the latest database migration.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black">Migration needed</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Run <code>npm run db:migrate</code> in this environment, then refresh
              this page to load Player Rank standings.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black">Player Rank</h1>
          <p className="text-sm text-muted-foreground">
            Follow the live standings and keep an eye on your recent movement.
          </p>
        </div>

        <PlayerRankSummaryCard
          title="Your Player Rank"
          rankGamesCount={data.playerRankGamesCount}
          rankPosition={data.playerRankPosition}
          rankTotal={data.playerRankTotal}
          recentChangeSummary={data.playerRankRecentChangeSummary}
          topThreeFinishes={data.topThreeFinishes}
          windowLabel={data.playerRankWindowLabel}
          twoPlayerPrizePool={data.twoPlayerPrizePool}
          threePlayerPrizePool={data.threePlayerPrizePool}
          sixPlusPlayerPrizePool={data.sixPlusPlayerPrizePool}
        />

        <PlayerRankStandingsList
          currentUserId={data.currentUserId}
          standings={data.standings}
        />
      </div>
    </div>
  );
}
