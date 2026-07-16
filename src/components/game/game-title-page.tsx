"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock3,
  History,
  Settings,
} from "lucide-react";
import GameTitleDefaultsEditor from "@/components/game/game-title-defaults-editor";
import GameTitleImage from "@/components/game/game-title-image";
import GameTitleImageEditor from "@/components/game/game-title-image-editor";
import { GameTitleRankChart } from "@/components/game/game-title-rank-chart";
import {
  ComparisonMetricRow,
  compareMetricValues,
} from "@/components/profile/comparison-metric-row";
import ProfilePicture from "@/components/profile/profile-picture";
import { ProfileMatchupSelector } from "@/components/profile/profile-matchup-selector";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sectionActionClassName } from "@/components/ui/section-styles";
import type {
  GameTitleComparisonSummary,
  GameTitleStatsPageData,
  GameTitleStatsSummary,
} from "@/lib/db/store/game.store";
import { useRememberedPageTabState } from "@/lib/use-remembered-page-tab-state";

type GameTitlePageTab = "stats" | "admin";
type ComparisonMode = "head-to-head" | "all-time";

const PUBLIC_TITLE_PAGE_TABS: readonly GameTitlePageTab[] = ["stats"];
const MANAGE_TITLE_PAGE_TABS: readonly GameTitlePageTab[] = ["stats", "admin"];
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
      ...compareMetricValues({
        current: current.totalGames,
        comparison: comparison.totalGames,
      }),
    },
    {
      label: "Completed",
      currentValue: current.completedGames,
      comparisonValue: comparison.completedGames,
      ...compareMetricValues({
        current: current.completedGames,
        comparison: comparison.completedGames,
      }),
    },
    {
      label: "Active games",
      currentValue: current.activeGames,
      comparisonValue: comparison.activeGames,
      ...compareMetricValues({
        current: current.activeGames,
        comparison: comparison.activeGames,
      }),
    },
    {
      label: "Wins",
      currentValue: current.wins,
      comparisonValue: comparison.wins,
      ...compareMetricValues({ current: current.wins, comparison: comparison.wins }),
    },
    {
      label: "Win rate",
      currentValue: formatPercent(current.winRate),
      comparisonValue: formatPercent(comparison.winRate),
      ...compareMetricValues({
        current: current.winRate,
        comparison: comparison.winRate,
      }),
    },
    {
      label: "Avg score",
      currentValue: formatScore(current.averageScore),
      comparisonValue: formatScore(comparison.averageScore),
      ...compareMetricValues({
        current: current.averageScore,
        comparison: comparison.averageScore,
        lowerIsBetter: true,
      }),
    },
    {
      label: "Best score",
      currentValue: formatScore(current.bestScore),
      comparisonValue: formatScore(comparison.bestScore),
      ...compareMetricValues({
        current: current.bestScore,
        comparison: comparison.bestScore,
        lowerIsBetter: true,
      }),
    },
    {
      label: rankWindowLabel,
      currentValue: current.rankGainInWindow.formatted,
      comparisonValue: comparison.rankGainInWindow.formatted,
      ...compareMetricValues({
        current: current.rankGainInWindow.minor,
        comparison: comparison.rankGainInWindow.minor,
      }),
    },
    {
      label: "All-time rank gain",
      currentValue: current.rankGainAllTime.formatted,
      comparisonValue: comparison.rankGainAllTime.formatted,
      ...compareMetricValues({
        current: current.rankGainAllTime.minor,
        comparison: comparison.rankGainAllTime.minor,
      }),
    },
    {
      label: "Best rank game",
      currentValue: current.bestRankGain?.formatted ?? "--",
      comparisonValue: comparison.bestRankGain?.formatted ?? "--",
      ...compareMetricValues({
        current: current.bestRankGain?.minor ?? null,
        comparison: comparison.bestRankGain?.minor ?? null,
      }),
    },
    {
      label: "Avg rank per game",
      currentValue: current.averageRankGain?.formatted ?? "--",
      comparisonValue: comparison.averageRankGain?.formatted ?? "--",
      ...compareMetricValues({
        current: current.averageRankGain?.minor ?? null,
        comparison: comparison.averageRankGain?.minor ?? null,
      }),
    },
    {
      label: "1st places",
      currentValue: current.placements.first,
      comparisonValue: comparison.placements.first,
      ...compareMetricValues({
        current: current.placements.first,
        comparison: comparison.placements.first,
      }),
    },
    {
      label: "2nd places",
      currentValue: current.placements.second,
      comparisonValue: comparison.placements.second,
      ...compareMetricValues({
        current: current.placements.second,
        comparison: comparison.placements.second,
      }),
    },
    {
      label: "3rd places",
      currentValue: current.placements.third,
      comparisonValue: comparison.placements.third,
      ...compareMetricValues({
        current: current.placements.third,
        comparison: comparison.placements.third,
      }),
    },
  ];
}

function ComparisonSection(props: {
  currentStats: GameTitleStatsSummary;
  comparison: GameTitleComparisonSummary | null;
  mode: ComparisonMode;
  currentColor: string;
  currentUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
    avatarUrl: string | null;
  };
}) {
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  if (!props.comparison) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
        Select a player to compare title performance side by side.
      </div>
    );
  }

  const comparison = props.comparison;
  const currentStats =
    props.mode === "head-to-head"
      ? comparison.headToHeadStats.current
      : props.currentStats;
  const comparisonStats =
    props.mode === "head-to-head"
      ? comparison.headToHeadStats.comparison
      : comparison.allTimeStats;
  const metrics = buildComparisonMetrics(currentStats, comparisonStats);
  const visibleMetrics = showAllMetrics
    ? metrics
    : metrics.slice(0, DEFAULT_VISIBLE_COMPARISON_METRICS);
  const hasHiddenMetrics = metrics.length > DEFAULT_VISIBLE_COMPARISON_METRICS;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/70 bg-card/95 p-4">
          <ProfilePicture user={props.currentUser} size="sm" />
          <p className="mt-2 text-2xl font-black">
            {currentStats.rankGainInWindow.formatted}
          </p>
          <p className="text-sm text-muted-foreground">
            {currentStats.rankWindowLabel ?? "Window rank gain"}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/95 p-4">
          <ProfilePicture user={props.comparison.user} size="sm" />
          <p className="mt-2 text-2xl font-black">
            {comparisonStats.rankGainInWindow.formatted}
          </p>
          <p className="text-sm text-muted-foreground">
            {comparisonStats.rankWindowLabel ?? "Window rank gain"}
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
          className="w-full rounded-xl border border-border/70"
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
  canManageTitleArtwork,
}: {
  data: GameTitleStatsPageData;
  canManageDefaults: boolean;
  canManageTitleArtwork: boolean;
}) {
  const canManageTitle = canManageDefaults || canManageTitleArtwork;
  const [selectedComparisonUserId, setSelectedComparisonUserId] = useState(
    data.defaultComparisonUserId,
  );
  const [comparisonMode, setComparisonMode] =
    useState<ComparisonMode>("head-to-head");
  const [activeTab, setActiveTab] =
    useRememberedPageTabState<GameTitlePageTab>({
      storageKey: `page-tab:/titles/${data.title.id}`,
      initialValue: "stats",
      validTabs: canManageTitle
        ? MANAGE_TITLE_PAGE_TABS
        : PUBLIC_TITLE_PAGE_TABS,
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
          className="p-6 pb-8 text-white shadow-xl"
          color={title.color}
          imageUrl={title.imageUrl}
          size="lg"
          verticalFocus={title.imageVerticalFocus}
          variant="hero"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                {title.title}
              </h1>
            </div>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-white/90 dark:text-slate-950"
              href={`/game/create/settings?titleId=${title.id}`}
            >
              Start a new game
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </GameTitleImage>

        <GameTitleRankChart
          series={data.chartSeries}
          defaultSelectedUserIds={data.defaultChartSelectedUserIds}
        />

        {canManageTitle ? (
          <div
            role="tablist"
            aria-label="Game title sections"
            className="grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-muted/70 p-1"
          >
            <Button
              type="button"
              role="tab"
              aria-selected={activeTab === "stats"}
              variant={activeTab === "stats" ? "default" : "ghost"}
              className="rounded-xl"
              size="sm"
              onClick={() => setActiveTab("stats")}
            >
              <BarChart3 />
              Stats
            </Button>
            <Button
              type="button"
              role="tab"
              aria-selected={activeTab === "admin"}
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

        <Link href={gameHistoryHref}>
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 p-0 text-[1.05rem] font-extrabold tracking-[-0.015em]">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-[0_1px_0_rgba(255,255,255,0.4)_inset]">
                  <History className="size-4.5" strokeWidth={2.25} />
                </span>
                <span>View game history</span>
              </CardTitle>
              <CardAction>
                <span className={sectionActionClassName}>
                  View
                  <ArrowRight />
                </span>
              </CardAction>
            </CardHeader>
          </Card>
        </Link>

        {canManageTitle && activeTab === "admin" ? (
          <div className="flex flex-col gap-6">
            {canManageTitleArtwork ? <GameTitleImageEditor title={title} /> : null}
            {canManageDefaults ? <GameTitleDefaultsEditor title={title} /> : null}
          </div>
        ) : null}

        {activeTab === "stats" ? (
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
                <div
                  role="tablist"
                  aria-label="Comparison scope"
                  className="grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/60 p-1"
                >
                  <Button
                    type="button"
                    role="tab"
                    aria-selected={comparisonMode === "head-to-head"}
                    variant={comparisonMode === "head-to-head" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setComparisonMode("head-to-head")}
                  >
                    Head to head
                  </Button>
                  <Button
                    type="button"
                    role="tab"
                    aria-selected={comparisonMode === "all-time"}
                    variant={comparisonMode === "all-time" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setComparisonMode("all-time")}
                  >
                    All games
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ComparisonSection
                  key={`${selectedComparisonUserId ?? "none"}:${comparisonMode}`}
                  currentStats={stats}
                  comparison={comparison}
                  mode={comparisonMode}
                  currentColor={currentUserColor}
                  currentUser={{
                    id: data.currentUserId,
                    firstName: data.currentUserFirstName,
                    lastName: data.currentUserLastName,
                    color: currentUserColor,
                    avatarUrl: data.currentUserAvatarUrl,
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-black">Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
                  <Clock3 className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Last played</p>
                    <p className="text-muted-foreground">
                      {formatDate(stats.lastPlayedAt)}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="font-semibold">Active games</p>
                  <p className="text-muted-foreground">
                    {stats.activeGames} still underway with this title.
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4">
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
