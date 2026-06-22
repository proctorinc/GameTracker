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
import { getProfileColorSurfaceStyles } from "@/components/profile/profile-color-styles";
import ProfilePicture from "@/components/profile/profile-picture";
import { ProfileMatchupSelector } from "@/components/profile/profile-matchup-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProfileStatsPageData } from "../profile-types";

const DEFAULT_VISIBLE_COMPARISON_METRICS = 5;

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
  className?: string;
  iconClassName?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "relative overflow-hidden border border-border/70 bg-card/95 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20",
        props.className,
      )}
    >
      <CardContent className="relative flex min-h-28 flex-col items-center justify-center gap-3 px-4 py-0 text-center sm:min-h-32 sm:px-5 sm:py-3.5">
        <div
          className={cn(
            "inline-flex size-12 items-center justify-center rounded-[1.2rem] border border-white/60 bg-white/90 text-foreground shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white",
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
          props.currentWins
            ? "font-bold text-foreground"
            : "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "relative isolate inline-flex min-h-9 min-w-9 items-center justify-center overflow-hidden rounded-full px-3 py-1 ring-1 ring-black/6 dark:ring-white/12",
            props.currentWins && "font-bold",
          )}
          style={
            props.currentWins
              ? getProfileColorSurfaceStyles(props.currentColor)
              : undefined
          }
        >
          {props.currentWins ? (
            <>
              <span className="pointer-events-none absolute inset-[1px] rounded-full border border-[var(--profile-surface-ring)]" />
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,var(--profile-surface-highlight)_0%,transparent_58%)] dark:bg-[radial-gradient(circle_at_30%_28%,rgba(15,23,42,0.18)_0%,transparent_58%)]" />
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_100%)]" />
            </>
          ) : null}
          <span className="relative z-10">{props.currentValue}</span>
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
          props.comparisonWins
            ? "font-bold text-foreground"
            : "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "relative isolate inline-flex min-h-9 min-w-9 items-center justify-center overflow-hidden rounded-full px-3 py-1 ring-1 ring-black/6 dark:ring-white/12",
            props.comparisonWins && "font-bold",
          )}
          style={
            props.comparisonWins
              ? getProfileColorSurfaceStyles(props.comparisonColor)
              : undefined
          }
        >
          {props.comparisonWins ? (
            <>
              <span className="pointer-events-none absolute inset-[1px] rounded-full border border-[var(--profile-surface-ring)]" />
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,var(--profile-surface-highlight)_0%,transparent_58%)] dark:bg-[radial-gradient(circle_at_30%_28%,rgba(15,23,42,0.18)_0%,transparent_58%)]" />
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_100%)]" />
            </>
          ) : null}
          <span className="relative z-10">{props.comparisonValue}</span>
        </span>
      </div>
    </div>
  );
}

function compareMetric(input: {
  current: number | null;
  comparison: number | null;
}) {
  if (input.current === null || input.comparison === null) {
    return { currentWins: false, comparisonWins: false };
  }

  if (input.current === input.comparison) {
    return { currentWins: true, comparisonWins: true };
  }

  return {
    currentWins: input.current > input.comparison,
    comparisonWins: input.comparison > input.current,
  };
}

function buildProfileComparisonMetrics(
  data: ProfileStatsPageData,
  comparisonUserId: string,
) {
  const comparison = data.comparisonSummariesByUserId[comparisonUserId];

  if (!comparison) {
    return [];
  }

  const comparisonOverallStats = getComparisonOverallStats(comparison);

  return [
    {
      label: "Wins",
      currentValue: data.stats.wins,
      comparisonValue: comparisonOverallStats.wins,
      ...compareMetric({
        current: data.stats.wins,
        comparison: comparisonOverallStats.wins,
      }),
    },
    {
      label: "1st places",
      currentValue: data.stats.placements.first,
      comparisonValue: comparisonOverallStats.placements.first,
      ...compareMetric({
        current: data.stats.placements.first,
        comparison: comparisonOverallStats.placements.first,
      }),
    },
    {
      label: "2nd places",
      currentValue: data.stats.placements.second,
      comparisonValue: comparisonOverallStats.placements.second,
      ...compareMetric({
        current: data.stats.placements.second,
        comparison: comparisonOverallStats.placements.second,
      }),
    },
    {
      label: "3rd places",
      currentValue: data.stats.placements.third,
      comparisonValue: comparisonOverallStats.placements.third,
      ...compareMetric({
        current: data.stats.placements.third,
        comparison: comparisonOverallStats.placements.third,
      }),
    },
    {
      label: "Win rate",
      currentValue: formatPercent(data.stats.winRate),
      comparisonValue: formatPercent(comparisonOverallStats.winRate),
      ...compareMetric({
        current: data.stats.winRate,
        comparison: comparisonOverallStats.winRate,
      }),
    },
    {
      label: "Completed",
      currentValue: data.stats.completedGames,
      comparisonValue: comparisonOverallStats.completedGames,
      ...compareMetric({
        current: data.stats.completedGames,
        comparison: comparisonOverallStats.completedGames,
      }),
    },
    {
      label: "Current streak",
      currentValue: formatStreak(
        data.stats.currentStreak.type,
        data.stats.currentStreak.count,
      ),
      comparisonValue: formatStreak(
        comparisonOverallStats.currentStreak.type,
        comparisonOverallStats.currentStreak.count,
      ),
      ...compareMetric({
        current: getComparableStreakValue(
          data.stats.currentStreak.type,
          data.stats.currentStreak.count,
        ),
        comparison: getComparableStreakValue(
          comparisonOverallStats.currentStreak.type,
          comparisonOverallStats.currentStreak.count,
        ),
      }),
    },
    {
      label: "Best streak",
      currentValue: data.stats.bestWinStreak,
      comparisonValue: comparisonOverallStats.bestWinStreak,
      ...compareMetric({
        current: data.stats.bestWinStreak,
        comparison: comparisonOverallStats.bestWinStreak,
      }),
    },
    {
      label: data.stats.rankWindowLabel ?? "Window rank gain",
      currentValue: data.stats.rankGainInWindow.formatted,
      comparisonValue: comparisonOverallStats.rankGainInWindow.formatted,
      ...compareMetric({
        current: data.stats.rankGainInWindow.minor,
        comparison: comparisonOverallStats.rankGainInWindow.minor,
      }),
    },
    {
      label: "All-time rank gain",
      currentValue: data.stats.rankGainAllTime.formatted,
      comparisonValue: comparisonOverallStats.rankGainAllTime.formatted,
      ...compareMetric({
        current: data.stats.rankGainAllTime.minor,
        comparison: comparisonOverallStats.rankGainAllTime.minor,
      }),
    },
    {
      label: "Best rank game",
      currentValue: data.stats.bestRankGain?.formatted ?? "--",
      comparisonValue: comparisonOverallStats.bestRankGain?.formatted ?? "--",
      ...compareMetric({
        current: data.stats.bestRankGain?.minor ?? null,
        comparison: comparisonOverallStats.bestRankGain?.minor ?? null,
      }),
    },
    {
      label: "Avg rank per game",
      currentValue: data.stats.averageRankGain?.formatted ?? "--",
      comparisonValue:
        comparisonOverallStats.averageRankGain?.formatted ?? "--",
      ...compareMetric({
        current: data.stats.averageRankGain?.minor ?? null,
        comparison: comparisonOverallStats.averageRankGain?.minor ?? null,
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
        ? buildProfileComparisonMetrics(data, selectedComparisonUserId)
        : [],
    [data, selectedComparisonUserId],
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
        <Card className="overflow-hidden rounded-[2rem] py-0 border border-border/70 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
          <CardContent className="relative px-5 py-0">
            <div
              className="absolute inset-0"
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
            className="group block overflow-hidden rounded-[2rem] border border-border/70 shadow-2xl shadow-black/10"
          >
            <GameTitleImage
              className="h-[20vh] bg-slate-950 text-white"
              color={data.stats.signatureTitle.color}
              contentClassName="h-full"
              imageUrl={data.stats.signatureTitle.imageUrl}
              imageClassName="transition-transform duration-500 group-hover:scale-[1.03]"
            >
              <div className="flex h-full flex-col justify-between p-5 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full border-white/20 bg-white/10 px-3 py-1 text-white backdrop-blur-sm"
                  >
                    Favorite game
                  </Badge>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/65">
                    Played {data.stats.signatureTitle.completedCount} times
                  </p>
                  <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                    {data.stats.signatureTitle.title}
                  </h2>
                  <p className="max-w-xl text-sm text-white/78">
                    Last played:{" "}
                    {formatDate(data.stats.signatureTitle.lastPlayedAt)}
                  </p>
                </div>
              </div>
            </GameTitleImage>
          </Link>
        ) : (
          <Card className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-xl shadow-black/5 dark:border-white/10 dark:bg-card dark:shadow-black/20">
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
          className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)]"
          iconClassName="bg-slate-950 text-white border-slate-900/20 dark:bg-white dark:text-slate-950 dark:border-white/20"
        />
        <StatCard
          label="Wins"
          value={data.stats.wins}
          icon={<Trophy className="size-6" />}
          className="bg-[linear-gradient(180deg,#fff8eb_0%,#fff1cf_100%)] dark:bg-[linear-gradient(180deg,rgba(245,158,11,0.18)_0%,rgba(255,255,255,0.03)_100%)]"
          iconClassName="bg-amber-400/90 text-slate-950 border-amber-300/50 dark:bg-amber-300 dark:text-slate-950 dark:border-amber-200/30"
        />
        <StatCard
          label="Win Rate"
          value={formatPercent(data.stats.winRate)}
          icon={<Target className="size-6" />}
          className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] dark:bg-[linear-gradient(180deg,rgba(99,102,241,0.18)_0%,rgba(255,255,255,0.03)_100%)]"
          iconClassName="bg-indigo-500/90 text-white border-indigo-400/40 dark:bg-indigo-400 dark:text-slate-950 dark:border-indigo-300/30"
        />
        <StatCard
          label="Streak"
          value={formatStreak(
            data.stats.currentStreak.type,
            data.stats.currentStreak.count,
          )}
          icon={<Zap className="size-6" />}
          className="bg-[linear-gradient(180deg,#fdf2f8_0%,#ffe4e6_100%)] dark:bg-[linear-gradient(180deg,rgba(244,63,94,0.16)_0%,rgba(255,255,255,0.03)_100%)]"
          iconClassName="bg-rose-500/90 text-white border-rose-400/40 dark:bg-rose-400 dark:text-slate-950 dark:border-rose-300/30"
        />
        <StatCard
          label="Best Streak"
          value={data.stats.bestWinStreak}
          icon={<Flame className="size-6" />}
          className="bg-[linear-gradient(180deg,#fff7ed_0%,#ffedd5_100%)] dark:bg-[linear-gradient(180deg,rgba(249,115,22,0.16)_0%,rgba(255,255,255,0.03)_100%)]"
          iconClassName="bg-orange-500/90 text-white border-orange-400/40 dark:bg-orange-400 dark:text-slate-950 dark:border-orange-300/30"
        />
        <StatCard
          label="Matchups"
          value={data.stats.bestFriendGames}
          icon={<Users className="size-6" />}
          className="bg-[linear-gradient(180deg,var(--profile-accent-soft),rgba(255,255,255,0.94)_75%)] dark:bg-[linear-gradient(180deg,var(--profile-accent-panel),rgba(255,255,255,0.03)_100%)]"
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
          </CardHeader>
          <CardContent>
            {selectedComparison ? (
              <div className="space-y-4">
                <div className="rounded-[1.6rem] border border-border/70 bg-card/95 p-4">
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
                        Head to head
                      </p>
                      <p className="mt-2 text-2xl font-black">
                        {selectedComparison.wins}-{selectedComparison.losses}
                      </p>
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
                    className="w-full rounded-2xl border border-border/70"
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
              <div className="rounded-[1.6rem] border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
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
