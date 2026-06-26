import { notFound } from "next/navigation";
import { PlayerRankSummaryCard } from "@/components/player-rank/player-rank-summary-card";
import ProfilePicture from "@/components/profile/profile-picture";

import { Card, CardContent } from "@/components/ui/card";
import { ProfileStatsSections } from "../_components/profile-stats-sections";
import { PublicProfileActions } from "./public-profile-actions";
import { getPublicProfilePageData } from "./page-data";
import { PlayerRankTrendCard } from "@/components/player-rank/player-rank-trend-card";

function formatMemberSince(createdAt: string | null) {
  if (!createdAt) {
    return "Joined recently";
  }

  return `Joined ${new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })}`;
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPublicProfilePageData(id);

  if (!data) {
    notFound();
  }

  return (
    <main className="relative min-h-screen px-4 pb-40">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-72"
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, ${data.profile.color} 16%, transparent) 0%, color-mix(in srgb, ${data.profile.color} 10%, transparent) 38%, transparent 100%), radial-gradient(circle at top, color-mix(in srgb, ${data.profile.color} 14%, transparent) 0%, transparent 68%)`,
        }}
      />
      <div className="relative mx-auto flex w-full max-w-md flex-col gap-6">
        <Card className="overflow-hidden border border-border/80 bg-card/95 shadow-2xl">
          <CardContent className="flex flex-col gap-4 pt-5">
            <div className="flex items-center gap-4">
              <ProfilePicture size="lg" user={data.profile} />
              <div className="min-w-0 flex-1 space-y-2 pb-1">
                <div className="space-y-1">
                  <h1 className="text-3xl font-black tracking-tight text-foreground">
                    {data.profile.displayName}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {formatMemberSince(data.profile.createdAt)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <PublicProfileActions
                profileId={data.profile.id}
                profileName={data.profile.displayName}
                viewerState={data.viewerState}
              />
            </div>
          </CardContent>
        </Card>
        {data.canViewPlayerRank ? (
          <PlayerRankSummaryCard
            rankGamesCount={data.playerRankGamesCount}
            rankPosition={data.playerRankPosition}
            showRankPosition={false}
            recentChangeSummary={data.playerRankRecentChangeSummary}
            rankTotal={data.playerRankTotal}
            topThreeFinishes={data.topThreeFinishes}
            windowLabel={data.playerRankWindowLabel}
            twoPlayerPrizePool={data.twoPlayerPrizePool}
            threePlayerPrizePool={data.threePlayerPrizePool}
            sixPlusPlayerPrizePool={data.sixPlusPlayerPrizePool}
          />
        ) : null}
        {/*// Add this in
        {data.playerRankTrend && (
          <PlayerRankTrendCard
            href="/player-rank"
            user={data.user}
            color={data.user.color}
            rankPosition={data.playerRankTrend.rankPosition}
            rankTotal={data.playerRankTrend.rankTotal}
            chartPoints={data.playerRankTrend.chartPoints}
            hasHistory={data.playerRankTrend.hasHistory}
          />
        )}*/}
        <ProfileStatsSections data={data} />
      </div>
    </main>
  );
}
