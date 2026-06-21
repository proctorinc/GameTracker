"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock3,
  Settings,
} from "lucide-react";
import GameTitleDefaultsEditor from "@/components/game/game-title-defaults-editor";
import { GameTitleHistoryList } from "@/components/game/game-title-history-list";
import GameTitleImage from "@/components/game/game-title-image";
import GameTitleImageEditor from "@/components/game/game-title-image-editor";
import { GameTitleRankChart } from "@/components/game/game-title-rank-chart";
import { getProfileColorFillStyles } from "@/components/profile/profile-color-styles";
import ProfilePicture from "@/components/profile/profile-picture";
import { ProfileMatchupSelector } from "@/components/profile/profile-matchup-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  GameTitleComparisonSummary,
  GameTitleStatsPageData,
  GameTitleStatsSummary,
} from "@/lib/db/store/game.store";
import { cn } from "@/lib/utils";
import { useRememberedPageTabState } from "@/lib/use-remembered-page-tab-state";

type GameTitlePageTab = "stats" | "admin";

const TITLE_PAGE_TABS = ["stats", "admin"] as const;
const DEFAULT_VISIBLE_COMPARISON_METRICS = 5;

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

function ComparisonMetricRow(props: {
  label: string;
  currentValue: string | number;
  comparisonValue: string | number;
  currentWins: boolean;
  comparisonWins: boolean;
  currentColor: string;
  comparisonColor: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
      <div
        className={cn(
          "flex items-center",
          props.currentWins ? "font-bold text-foreground" : "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full px-3 py-1",
            props.currentWins && "font-bold",
          )}
          style={
            props.currentWins
              ? getProfileColorFillStyles(props.currentColor)
              : undefined
          }
        >
          {props.currentValue}
        </span>
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {props.label}
        </p>
      </div>
      <div
        className={cn(
          "flex items-center justify-end",
          props.comparisonWins ? "font-bold text-foreground" : "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full px-3 py-1",
            props.comparisonWins && "font-bold",
          )}
          style={
            props.comparisonWins
              ? getProfileColorFillStyles(props.comparisonColor)
              : undefined
          }
        >
          {props.comparisonValue}
        </span>
      </div>
    </div>
  );
}

function compareMetric(input: {
  current: number | null;
  comparison: number | null;
  higherIsBetter?: boolean;
  lowerIsBetter?: boolean;
}) {
  if (input.current === null || input.comparison === null) {
    return { currentWins: false, comparisonWins: false };
  }

  if (input.current === input.comparison) {
    return { currentWins: true, comparisonWins: true };
  }

  if (input.lowerIsBetter) {
    return {
      currentWins: input.current < input.comparison,
      comparisonWins: input.comparison < input.current,
    };
  }

  return {
    currentWins: input.current > input.comparison,
    comparisonWins: input.comparison > input.current,
  };
}

function buildComparisonMetrics(
  current: GameTitleStatsSummary,
  comparison: GameTitleStatsSummary,
) {
  const rankWindowLabel = current.rankWindowLabel ?? "Window rank gain";

  return [
    {
      label: "Games played",
      currentValue: current.totalGames,
      comparisonValue: comparison.totalGames,
      ...compareMetric({ current: current.totalGames, comparison: comparison.totalGames }),
    },
    {
      label: "Completed",
      currentValue: current.completedGames,
      comparisonValue: comparison.completedGames,
      ...compareMetric({ current: current.completedGames, comparison: comparison.completedGames }),
    },
    {
      label: "Active games",
      currentValue: current.activeGames,
      comparisonValue: comparison.activeGames,
      ...compareMetric({ current: current.activeGames, comparison: comparison.activeGames }),
    },
    {
      label: "Wins",
      currentValue: current.wins,
      comparisonValue: comparison.wins,
      ...compareMetric({ current: current.wins, comparison: comparison.wins }),
    },
    {
      label: "Win rate",
      currentValue: formatPercent(current.winRate),
      comparisonValue: formatPercent(comparison.winRate),
      ...compareMetric({ current: current.winRate, comparison: comparison.winRate }),
    },
    {
      label: "Avg score",
      currentValue: formatScore(current.averageScore),
      comparisonValue: formatScore(comparison.averageScore),
      ...compareMetric({
        current: current.averageScore,
        comparison: comparison.averageScore,
        lowerIsBetter: true,
      }),
    },
    {
      label: "Best score",
      currentValue: formatScore(current.bestScore),
      comparisonValue: formatScore(comparison.bestScore),
      ...compareMetric({
        current: current.bestScore,
        comparison: comparison.bestScore,
        lowerIsBetter: true,
      }),
    },
    {
      label: rankWindowLabel,
      currentValue: current.rankGainInWindow.formatted,
      comparisonValue: comparison.rankGainInWindow.formatted,
      ...compareMetric({
        current: current.rankGainInWindow.minor,
        comparison: comparison.rankGainInWindow.minor,
      }),
    },
    {
      label: "All-time rank gain",
      currentValue: current.rankGainAllTime.formatted,
      comparisonValue: comparison.rankGainAllTime.formatted,
      ...compareMetric({
        current: current.rankGainAllTime.minor,
        comparison: comparison.rankGainAllTime.minor,
      }),
    },
    {
      label: "Best rank game",
      currentValue: current.bestRankGain?.formatted ?? "--",
      comparisonValue: comparison.bestRankGain?.formatted ?? "--",
      ...compareMetric({
        current: current.bestRankGain?.minor ?? null,
        comparison: comparison.bestRankGain?.minor ?? null,
      }),
    },
    {
      label: "Avg rank per game",
      currentValue: current.averageRankGain?.formatted ?? "--",
      comparisonValue: comparison.averageRankGain?.formatted ?? "--",
      ...compareMetric({
        current: current.averageRankGain?.minor ?? null,
        comparison: comparison.averageRankGain?.minor ?? null,
      }),
    },
    {
      label: "1st places",
      currentValue: current.placements.first,
      comparisonValue: comparison.placements.first,
      ...compareMetric({
        current: current.placements.first,
        comparison: comparison.placements.first,
      }),
    },
    {
      label: "2nd places",
      currentValue: current.placements.second,
      comparisonValue: comparison.placements.second,
      ...compareMetric({
        current: current.placements.second,
        comparison: comparison.placements.second,
      }),
    },
    {
      label: "3rd places",
      currentValue: current.placements.third,
      comparisonValue: comparison.placements.third,
      ...compareMetric({
        current: current.placements.third,
        comparison: comparison.placements.third,
      }),
    },
  ];
}

function ComparisonSection(props: {
  currentStats: GameTitleStatsSummary;
  comparison: GameTitleComparisonSummary | null;
  currentColor: string;
  currentUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
  };
}) {
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  if (!props.comparison) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
        Select a player to compare title performance side by side.
      </div>
    );
  }

  const comparison = props.comparison;
  const metrics = buildComparisonMetrics(props.currentStats, comparison.stats);
  const visibleMetrics = showAllMetrics
    ? metrics
    : metrics.slice(0, DEFAULT_VISIBLE_COMPARISON_METRICS);
  const hasHiddenMetrics = metrics.length > DEFAULT_VISIBLE_COMPARISON_METRICS;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.6rem] border border-border/70 bg-card/95 p-4">
          <ProfilePicture user={props.currentUser} size="sm" />
          <p className="mt-2 text-2xl font-black">
            {props.currentStats.rankGainInWindow.formatted}
          </p>
          <p className="text-sm text-muted-foreground">
            {props.currentStats.rankWindowLabel ?? "Window rank gain"}
          </p>
        </div>
        <div className="rounded-[1.6rem] border border-border/70 bg-card/95 p-4">
          <ProfilePicture user={props.comparison.user} size="sm" />
          <p className="mt-2 text-2xl font-black">
            {props.comparison.stats.rankGainInWindow.formatted}
          </p>
          <p className="text-sm text-muted-foreground">
            {props.comparison.stats.rankWindowLabel ?? "Window rank gain"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {visibleMetrics.map((metric) => (
          <ComparisonMetricRow
            key={metric.label}
            {...metric}
            currentColor={props.currentColor}
            comparisonColor={comparison.user.color}
          />
        ))}
      </div>

      {hasHiddenMetrics ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full rounded-2xl border border-border/70"
          onClick={() => setShowAllMetrics((current) => !current)}
        >
          {showAllMetrics ? <ChevronUp /> : <ChevronDown />}
          {showAllMetrics ? "Show fewer" : "Show all"}
        </Button>
      ) : null}
    </div>
  );
}

export default function GameTitlePage({
  data,
  canManageDefaults,
}: {
  data: GameTitleStatsPageData;
  canManageDefaults: boolean;
}) {
  const [selectedComparisonUserId, setSelectedComparisonUserId] = useState(
    data.defaultComparisonUserId,
  );
  const [activeTab, setActiveTab] =
    useRememberedPageTabState<GameTitlePageTab>({
      storageKey: `page-tab:/titles/${data.title.id}`,
      initialValue: "stats",
      validTabs: TITLE_PAGE_TABS,
    });
  const comparison = useMemo(
    () =>
      selectedComparisonUserId
        ? data.comparisonSummariesByUserId[selectedComparisonUserId] ?? null
        : null,
    [data.comparisonSummariesByUserId, selectedComparisonUserId],
  );
  const { title, stats } = data;
  const currentUserColor =
    data.chartSeries.find((entry) => entry.isCurrentUser)?.color ?? title.color;
  const gameHistoryHref = `/game/history?titleId=${encodeURIComponent(title.id)}`;

  return (
    <div className="min-h-screen px-4 pb-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <GameTitleImage
          className="rounded-[2rem] border border-black/5 p-6 text-white shadow-xl"
          color={title.color}
          imageUrl={title.imageUrl}
          variant="hero"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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
        </GameTitleImage>

        <GameTitleRankChart
          series={data.chartSeries}
          selectedComparisonUserId={selectedComparisonUserId}
        />

        {canManageDefaults ? (
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-muted/70 p-1">
            <Button
              variant={activeTab === "stats" ? "default" : "ghost"}
              className="rounded-xl"
              size="sm"
              onClick={() => setActiveTab("stats")}
            >
              <BarChart3 />
              Stats
            </Button>
            <Button
              variant={activeTab === "admin" ? "default" : "ghost"}
              className="rounded-xl"
              size="sm"
              onClick={() => setActiveTab("admin")}
            >
              <Settings />
              Admin
            </Button>
          </div>
        ) : null}

        {canManageDefaults && activeTab === "admin" ? (
          <div className="flex flex-col gap-6">
            <GameTitleImageEditor title={title} />
            <GameTitleDefaultsEditor title={title} />
          </div>
        ) : null}

        {!canManageDefaults || activeTab === "stats" ? (
          <div className="grid gap-6">
            <Card>
              <CardHeader className="gap-4">
                <CardTitle className="text-xl font-black">Compare</CardTitle>
                <ProfileMatchupSelector
                  options={data.comparisonOptions}
                  selectedUserId={selectedComparisonUserId}
                  onSelect={setSelectedComparisonUserId}
                  defaultBestFriendId={data.defaultComparisonUserId}
                  title="Compare player"
                  description="Search players to compare this title."
                  emptyLabel="Choose a player"
                />
              </CardHeader>
              <CardContent>
                <ComparisonSection
                  currentStats={stats}
                  comparison={comparison}
                  currentColor={currentUserColor}
                  currentUser={{
                    id: data.currentUserId,
                    firstName: null,
                    lastName: null,
                    color: currentUserColor,
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-xl font-black">
                    History
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
                <GameTitleHistoryList
                  games={data.history}
                  comparisonUserId={selectedComparisonUserId}
                />
              </CardContent>
            </Card>

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
        ) : null}
      </div>
    </div>
  );
}
