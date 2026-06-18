import { AdminPlayerRanks } from "@/components/admin/admin-player-ranks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUser } from "@/lib/auth/protected-session";
import {
  getActivePlayerRankConfig,
  listPlayerRankStandings,
  type PlayerRankPreviewRow,
} from "@/lib/db/store/player-rank.store";
import { redirect } from "next/navigation";

function toInitialPreviewRows(
  standings: Awaited<ReturnType<typeof listPlayerRankStandings>>,
): PlayerRankPreviewRow[] {
  return standings.map((row) => ({
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: row.displayName,
    currentRankTotal: row.playerRankTotal,
    currentRankTotalMinor: row.playerRankTotalMinor,
    currentPosition: row.playerRankPosition,
    previewRankTotal: row.playerRankTotal,
    previewRankTotalMinor: row.playerRankTotalMinor,
    previewPosition: row.playerRankPosition,
    deltaMinor: 0,
    eligibleGamesCount: row.playerRankGamesCount,
  }));
}

export default async function AdminPlayerRanksPage() {
  const { user } = await loadUser();

  if (!user || user.role !== "admin") {
    redirect("/profile");
  }

  const [activeConfig, standings] = await Promise.all([
    getActivePlayerRankConfig(),
    listPlayerRankStandings(),
  ]);

  if (!activeConfig) {
    return (
      <div className="min-h-screen overflow-y-auto px-4 pb-40">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
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
              this page to load the Player Rank settings and preview tools.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black">Player Rank</h1>
          <p className="text-sm text-muted-foreground">
            Tune payout weights and preview how the current platform standings move.
          </p>
        </div>

        <AdminPlayerRanks
          activeConfig={activeConfig}
          standings={toInitialPreviewRows(standings)}
        />
      </div>
    </div>
  );
}
