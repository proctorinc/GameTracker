import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GameTitleDefaultsEditor from "@/components/game/game-title-defaults-editor";
import GameHistoryList from "@/components/game/game-history-list";
import type { GameTitleStatsPageData } from "@/lib/db/store/game.store";
import { ArrowRight, Clock3 } from "lucide-react";

function formatDate(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatScore(value: number | null) {
  if (value === null) {
    return "--";
  }

  return value.toFixed(1).replace(".0", "");
}

function StatCard(props: { label: string; value: string | number }) {
  return (
    <Card
      size="sm"
      className="min-h-30 border border-border/80 bg-card/95 sm:min-h-32"
    >
      <CardHeader className="pb-1">
        <CardTitle className="pl-0 text-[11px] leading-tight font-medium text-muted-foreground sm:text-xs">
          {props.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 items-end pt-0 text-2xl font-black tracking-tight sm:text-3xl">
        {props.value}
      </CardContent>
    </Card>
  );
}

export default function GameTitlePage({
  data,
  currentUserId,
  canManageDefaults,
}: {
  data: GameTitleStatsPageData;
  currentUserId: string;
  canManageDefaults: boolean;
}) {
  const { title, recentHistory, stats } = data;
  const gameHistoryHref = `/game/history?titleId=${encodeURIComponent(title.id)}`;

  return (
    <div className="min-h-screen px-4 pb-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-black/5 p-6 text-white shadow-xl"
          style={{ backgroundColor: title.color }}
        >
          {title.imageUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-35"
              style={{ backgroundImage: `url("${title.imageUrl}")` }}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/30 to-transparent" />
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <Badge
                className="w-fit border-white/25 bg-white/15 text-white backdrop-blur-sm"
                variant="outline"
              >
                {title.isUniversal ? "Universal title" : "Personal title"}
              </Badge>
              <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                  {title.title}
                </h1>
                <p className="max-w-2xl text-sm text-white/80">
                  History and performance across every game you&apos;ve played
                  with this title.
                </p>
              </div>
            </div>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-white/90"
              href={`/game/create/settings?titleId=${title.id}`}
            >
              Start a new game
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Games played" value={stats.totalGames} />
          <StatCard label="Completed" value={stats.completedGames} />
          <StatCard label="Wins" value={stats.wins} />
          <StatCard label="Win rate" value={formatPercent(stats.winRate)} />
          <StatCard label="Avg score" value={formatScore(stats.averageScore)} />
          <StatCard label="Best score" value={formatScore(stats.bestScore)} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-xl font-black">
                  Game history
                </CardTitle>
                <Link
                  href={gameHistoryHref}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  View all
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <GameHistoryList
                games={recentHistory}
                currentUserId={currentUserId}
                emptyMessage="No games played for this title yet."
                emptyActionHref={`/game/create/settings?titleId=${title.id}`}
                emptyActionLabel="Start the first game"
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            {canManageDefaults ? (
              <GameTitleDefaultsEditor title={title} />
            ) : null}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-black">Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start gap-3 rounded-2xl bg-muted/50 p-4">
                  <Clock3 className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Last played</p>
                    <p className="text-muted-foreground">
                      {formatDate(stats.lastPlayedAt)}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="font-semibold">Active games</p>
                  <p className="text-muted-foreground">
                    {stats.activeGames} still underway with this title.
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="font-semibold">Rounds logged</p>
                  <p className="text-muted-foreground">
                    {stats.totalRounds} completed rounds across your history.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
