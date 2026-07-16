"use client";

import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Flame,
  Gamepad2,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import GameTitleImage from "@/components/game/game-title-image";
import {
  ComparisonMetricRow,
  compareMetricValues,
} from "@/components/profile/comparison-metric-row";
import ProfilePicture from "@/components/profile/profile-picture";
import { ProfileMatchupSelector } from "@/components/profile/profile-matchup-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProfileStatsPageData } from "../profile-types";

const DEFAULT_VISIBLE_COMPARISON_METRICS = 5;
type ComparisonMode = "head-to-head" | "all-time";

function formatDate(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatPercent(value: number | null) {
  return value === null ? "--" : `${value}%`;
}

function formatStreak(type: "win" | "loss" | null, count: number) {
  if (!type || count === 0) {
    return "--";
  }

  return `${type === "win" ? "W" : "L"}${count}`;
}

function getComparableStreakValue(type: "win" | "loss" | null, count: number) {
  if (!type || count === 0) {
    return null;
  }

  return type === "win" ? count : -count;
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function alphaColor(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const safe =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized.padEnd(6, "0");
  const value = Number.parseInt(safe, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function buildAccentStyles(color: string): CSSProperties {
  return {
    ["--profile-accent" as string]: color,
    ["--profile-accent-soft" as string]: alphaColor(color, 0.12),
    ["--profile-accent-panel" as string]: alphaColor(color, 0.18),
    ["--profile-accent-glow" as string]: alphaColor(color, 0.28),
    ["--profile-accent-line" as string]: alphaColor(color, 0.38),
  };
}

function StatCard(props: {
  label: string;
  value: string | number;
  icon: ReactNode;
  cardClassName?: string;
  surfaceClassName: string;
  iconClassName?: string;
}) {
  return (
    <Card
      size="sm"
      style={{ backgroundImage: "none" }}
      className={cn(
        "relative overflow-hidden bg-card/95 shadow-lg ring-0 dark:bg-white/5 dark:shadow-black/20",
        props.cardClassName,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0",
          props.surfaceClassName,
        )}
      />
      <CardContent className="relative flex min-h-28 flex-col items-center justify-center gap-3 px-4 py-0 text-center sm:min-h-32 sm:px-5 sm:py-3.5">
        <div
          className={cn(
            "inline-flex size-12 items-center justify-center rounded-xl border border-white/60 bg-white/90 text-foreground shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white",
            props.iconClassName,
          )}
        >
          {props.icon}
        </div>
        <div className="space-y-2">
          <p className="text-4xl font-black tracking-tight text-foreground dark:text-white sm:text-[2.7rem]">
            {props.value}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground dark:text-white/60">
            {props.label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function buildProfileComparisonMetrics(
  data: ProfileStatsPageData,
  comparisonUserId: string,
  mode: ComparisonMode,
) {
  const comparison = data.comparisonSummariesByUserId[comparisonUserId];

  if (!comparison) {
    return [];
  }

  const currentStats =
    mode === "head-to-head" ? comparison.headToHeadStats.profile : data.stats;
  const comparisonStats =
    mode === "head-to-head"
      ? comparison.headToHeadStats.comparison
      : getComparisonOverallStats(comparison);

  return [
    {
      label: "Wins",
      currentValue: currentStats.wins,
      comparisonValue: comparisonStats.wins,
      ...compareMetricValues({
        current: currentStats.wins,
        comparison: comparisonStats.wins,
      }),
    },
    {
      label: "1st places",
      currentValue: currentStats.placements.first,
      comparisonValue: comparisonStats.placements.first,
      ...compareMetricValues({
        current: currentStats.placements.first,
        comparison: comparisonStats.placements.first,
      }),
    },
    {
      label: "2nd places",
      currentValue: currentStats.placements.second,
      comparisonValue: comparisonStats.placements.second,
      ...compareMetricValues({
        current: currentStats.placements.second,
        comparison: comparisonStats.placements.second,
      }),
    },
    {
      label: "3rd places",
      currentValue: currentStats.placements.third,
      comparisonValue: comparisonStats.placements.third,
      ...compareMetricValues({
        current: currentStats.placements.third,
        comparison: comparisonStats.placements.third,
      }),
    },
    {
      label: "Win rate",
      currentValue: formatPercent(currentStats.winRate),
      comparisonValue: formatPercent(comparisonStats.winRate),
      ...compareMetricValues({
        current: currentStats.winRate,
        comparison: comparisonStats.winRate,
      }),
    },
    {
      label: "Completed",
      currentValue: currentStats.completedGames,
      comparisonValue: comparisonStats.completedGames,
      ...compareMetricValues({
        current: currentStats.completedGames,
        comparison: comparisonStats.completedGames,
      }),
    },
    {
      label: "Current streak",
      currentValue: formatStreak(
        currentStats.currentStreak.type,
        currentStats.currentStreak.count,
      ),
      comparisonValue: formatStreak(
        comparisonStats.currentStreak.type,
        comparisonStats.currentStreak.count,
      ),
      ...compareMetricValues({
        current: getComparableStreakValue(
          currentStats.currentStreak.type,
          currentStats.currentStreak.count,
        ),
        comparison: getComparableStreakValue(
          comparisonStats.currentStreak.type,
          comparisonStats.currentStreak.count,
        ),
      }),
    },
    {
      label: "Best streak",
      currentValue: currentStats.bestWinStreak,
      comparisonValue: comparisonStats.bestWinStreak,
      ...compareMetricValues({
        current: currentStats.bestWinStreak,
        comparison: comparisonStats.bestWinStreak,
      }),
    },
    {
      label: currentStats.rankWindowLabel ?? "Window rank gain",
      currentValue: currentStats.rankGainInWindow.formatted,
      comparisonValue: comparisonStats.rankGainInWindow.formatted,
      ...compareMetricValues({
        current: currentStats.rankGainInWindow.minor,
        comparison: comparisonStats.rankGainInWindow.minor,
      }),
    },
    {
      label: "All-time rank gain",
      currentValue: currentStats.rankGainAllTime.formatted,
      comparisonValue: comparisonStats.rankGainAllTime.formatted,
      ...compareMetricValues({
        current: currentStats.rankGainAllTime.minor,
        comparison: comparisonStats.rankGainAllTime.minor,
      }),
    },
    {
      label: "Best rank game",
      currentValue: currentStats.bestRankGain?.formatted ?? "--",
      comparisonValue: comparisonStats.bestRankGain?.formatted ?? "--",
      ...compareMetricValues({
        current: currentStats.bestRankGain?.minor ?? null,
        comparison: comparisonStats.bestRankGain?.minor ?? null,
      }),
    },
    {
      label: "Avg rank per game",
      currentValue: currentStats.averageRankGain?.formatted ?? "--",
      comparisonValue: comparisonStats.averageRankGain?.formatted ?? "--",
      ...compareMetricValues({
        current: currentStats.averageRankGain?.minor ?? null,
        comparison: comparisonStats.averageRankGain?.minor ?? null,
      }),
    },
  ];
}

function getComparisonOverallStats(
  comparison: ProfileStatsPageData["comparisonSummariesByUserId"][string],
) {
  return (
    comparison.overallStats ?? {
      completedGames: comparison.completedGamesTogether,
      wins: comparison.wins,
      winRate: comparison.winRate,
      currentStreak: comparison.currentStreak,
      bestWinStreak: 0,
      signatureTitle: null,
      lastPlayedAt: comparison.lastPlayedAt,
      placements: {
        first: comparison.wins,
        second: 0,
        third: 0,
      },
      rankWindowLabel: "Window rank gain",
      rankGainInWindow: { formatted: "0", minor: 0 },
      rankGainAllTime: { formatted: "0", minor: 0 },
      bestRankGain: null,
      averageRankGain: null,
      currentGlobalRankTotal: null,
      currentGlobalRankPosition: null,
    }
  );
}

export function ProfileStatsSections({
  data,
  hero,
}: {
  data: ProfileStatsPageData;
  hero?: ReactNode;
}) {
  const [selectedComparisonUserId, setSelectedComparisonUserId] = useState(
    data.defaultComparisonUserId,
  );
  const [showAllComparisonMetrics, setShowAllComparisonMetrics] =
    useState(false);
  const [comparisonMode, setComparisonMode] =
    useState<ComparisonMode>("head-to-head");
  const accentStyles = useMemo(
    () => buildAccentStyles(data.profile.color),
    [data.profile.color],
  );

  const selectedComparison = useMemo(() => {
    if (!selectedComparisonUserId) {
      return null;
    }

    return data.comparisonSummariesByUserId[selectedComparisonUserId] ?? null;
  }, [data.comparisonSummariesByUserId, selectedComparisonUserId]);
  const comparisonMetrics = useMemo(
    () =>
      selectedComparisonUserId
        ? buildProfileComparisonMetrics(data, selectedComparisonUserId, comparisonMode)
        : [],
    [comparisonMode, data, selectedComparisonUserId],
  );
  const visibleComparisonMetrics = showAllComparisonMetrics
    ? comparisonMetrics
    : comparisonMetrics.slice(0, DEFAULT_VISIBLE_COMPARISON_METRICS);
  const hasHiddenComparisonMetrics =
    comparisonMetrics.length > DEFAULT_VISIBLE_COMPARISON_METRICS;

  return (
    <div className="space-y-4" style={accentStyles}>
      {hero}
      <section>
        <Card
          className="overflow-hidden rounded-xl py-0 border border-border/70 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20"
          style={{ backgroundImage: "none" }}
        >
          <CardContent className="relative px-5 py-0">
            <div
              className="absolute inset-0 backdrop-blur-xs opacity-80"
              style={{
                background:
                  "linear-gradient(135deg,var(--profile-accent-soft),transparent 55%)",
              }}
            />
            <div className="relative flex items-start justify-between gap-4">
              <div className="space-y-2 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground dark:text-white/60">
                  My activity
                </p>
                <h2 className="text-2xl font-black tracking-tight text-foreground dark:text-white sm:text-[2.1rem]">
                  {data.stats.storyline.label}
                </h2>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        {data.stats.signatureTitle ? (
          <Link
            href={`/titles/${encodeURIComponent(data.stats.signatureTitle.id)}`}
            className="group block overflow-hidden rounded-xl border border-border/70 shadow-2xl shadow-black/10"
          >
            <GameTitleImage
              className="bg-slate-800 text-white dark:bg-slate-950"
              color={data.stats.signatureTitle.color}
              contentClassName="h-full"
              imageUrl={data.stats.signatureTitle.imageUrl}
              size="lg"
              verticalFocus={data.stats.signatureTitle.imageVerticalFocus}
              imageClassName="transition-transform duration-500 group-hover:scale-[1.03]"
            >
              <div className="flex h-full flex-col justify-center p-5 sm:p-6">
                <div className="space-y-3">
                  <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                    {data.stats.signatureTitle.title}
                  </h2>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/65">
                    Played {data.stats.signatureTitle.completedCount} times
                  </p>
                </div>
              </div>
            </GameTitleImage>
          </Link>
        ) : (
          <Card className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xl shadow-black/5 dark:border-white/10 dark:bg-card dark:shadow-black/20">
            <CardContent className="relative p-6">
              <div
                className="absolute inset-0 opacity-70 dark:opacity-100"
                style={{
                  background:
                    "linear-gradient(135deg,var(--profile-accent-soft),transparent 52%)",
                }}
              />
              <div className="relative space-y-3">
                <Badge
                  variant="outline"
                  className="rounded-full border-border/80 bg-background/80 text-foreground dark:border-white/10 dark:bg-white/6 dark:text-white/88"
                >
                  Favorite game
                </Badge>
                <h2 className="text-3xl font-black tracking-tight text-foreground dark:text-white">
                  Favorite game coming soon
                </h2>
                <p className="max-w-xl text-sm text-muted-foreground dark:text-white/72">
                  Finish a few more games and we&apos;ll highlight the title you
                  come back to most.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="grid grid-cols-3 gap-3 xl:grid-cols-3">
        <StatCard
          label="Games"
          value={data.stats.completedGames}
          icon={<Gamepad2 className="size-6" />}
          cardClassName="border-slate-300/70 shadow-slate-950/10 dark:border-white/10"
          surfaceClassName="bg-[linear-gradient(180deg,#ffffff_0%,#f1f5f9_100%)] dark:bg-[linear-gradient(180deg,rgba(148,163,184,0.16)_0%,rgba(255,255,255,0.03)_100%)]"
          iconClassName="bg-slate-800 text-white border-slate-800/20 dark:bg-white dark:text-slate-950 dark:border-white/20"
        />
        <StatCard
          label="Wins"
          value={data.stats.wins}
          icon={<Trophy className="size-6" />}
          cardClassName="border-amber-300/70 shadow-amber-950/10 dark:border-amber-200/20"
          surfaceClassName="bg-[linear-gradient(180deg,#fff8eb_0%,#fff1cf_100%)] dark:bg-[linear-gradient(180deg,rgba(245,158,11,0.18)_0%,rgba(255,255,255,0.03)_100%)]"
          iconClassName="bg-amber-400/90 text-slate-800 border-amber-300/50 dark:bg-amber-300 dark:text-slate-950 dark:border-amber-200/30"
        />
        <StatCard
          label="Win Rate"
          value={formatPercent(data.stats.winRate)}
          icon={<Target className="size-6" />}
          cardClassName="border-indigo-300/70 shadow-indigo-950/10 dark:border-indigo-300/20"
          surfaceClassName="bg-[linear-gradient(180deg,#f8fafc_0%,#e0e7ff_100%)] dark:bg-[linear-gradient(180deg,rgba(99,102,241,0.18)_0%,rgba(255,255,255,0.03)_100%)]"
          iconClassName="bg-indigo-500/90 text-white border-indigo-400/40 dark:bg-indigo-400 dark:text-slate-950 dark:border-indigo-300/30"
        />
        <StatCard
          label="Streak"
          value={formatStreak(
            data.stats.currentStreak.type,
            data.stats.currentStreak.count,
          )}
          icon={<Zap className="size-6" />}
          cardClassName="border-rose-300/70 shadow-rose-950/10 dark:border-rose-300/20"
          surfaceClassName="bg-[linear-gradient(180deg,#fff1f2_0%,#ffe4e6_100%)] dark:bg-[linear-gradient(180deg,rgba(244,63,94,0.16)_0%,rgba(255,255,255,0.03)_100%)]"
          iconClassName="bg-rose-500/90 text-white border-rose-400/40 dark:bg-rose-400 dark:text-slate-950 dark:border-rose-300/30"
        />
        <StatCard
          label="Best Streak"
          value={data.stats.bestWinStreak}
          icon={<Flame className="size-6" />}
          cardClassName="border-orange-300/70 shadow-orange-950/10 dark:border-orange-300/20"
          surfaceClassName="bg-[linear-gradient(180deg,#fff7ed_0%,#ffedd5_100%)] dark:bg-[linear-gradient(180deg,rgba(249,115,22,0.16)_0%,rgba(255,255,255,0.03)_100%)]"
          iconClassName="bg-orange-500/90 text-white border-orange-400/40 dark:bg-orange-400 dark:text-slate-950 dark:border-orange-300/30"
        />
        <StatCard
          label="Matchups"
          value={data.stats.bestFriendGames}
          icon={<Users className="size-6" />}
          cardClassName="border-[var(--profile-accent-line)] shadow-[0_10px_15px_-3px_var(--profile-accent-glow)] dark:border-[var(--profile-accent-line)]"
          surfaceClassName="bg-[linear-gradient(180deg,var(--profile-accent-soft),rgba(255,255,255,0.94)_75%)] dark:bg-[linear-gradient(180deg,var(--profile-accent-panel),rgba(255,255,255,0.03)_100%)]"
          iconClassName="border-[var(--profile-accent-line)] bg-[var(--profile-accent)] text-white dark:border-white/10"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="gap-4">
            <CardTitle className="text-xl font-black">Compare</CardTitle>
            <ProfileMatchupSelector
              options={data.comparisonOptions}
              selectedUserId={selectedComparisonUserId}
              onSelect={(userId) => {
                setSelectedComparisonUserId(userId);
                setShowAllComparisonMetrics(false);
              }}
              defaultBestFriendId={data.defaultBestFriend?.id ?? null}
              title="Compare player"
              description="Search players to compare full profile performance."
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
                onClick={() => {
                  setComparisonMode("head-to-head");
                  setShowAllComparisonMetrics(false);
                }}
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
                onClick={() => {
                  setComparisonMode("all-time");
                  setShowAllComparisonMetrics(false);
                }}
              >
                All games
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedComparison ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-card/95 p-4">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="min-w-0">
                      <ProfilePicture
                        user={data.profile}
                        size="sm"
                        linkToProfile
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {comparisonMode === "head-to-head"
                          ? "Head to head"
                          : "All games"}
                      </p>
                      {comparisonMode === "head-to-head" ? (
                        <p className="mt-2 text-2xl font-black">
                          {selectedComparison.wins}-{selectedComparison.losses}
                        </p>
                      ) : null}
                    </div>
                    <div className="min-w-0 text-right">
                      <div className="flex justify-end">
                        <ProfilePicture
                          user={selectedComparison.user}
                          size="sm"
                          linkToProfile
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {visibleComparisonMetrics.map((metric) => (
                    <ComparisonMetricRow
                      key={metric.label}
                      {...metric}
                      currentColor={data.profile.color}
                      comparisonColor={selectedComparison.user.color}
                    />
                  ))}
                </div>

                {hasHiddenComparisonMetrics ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full rounded-xl border border-border/70"
                    onClick={() =>
                      setShowAllComparisonMetrics((current) => !current)
                    }
                  >
                    {showAllComparisonMetrics ? <ChevronUp /> : <ChevronDown />}
                    {showAllComparisonMetrics ? "Show fewer" : "Show all"}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
                Select a player to compare overall profile performance side by
                side.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
