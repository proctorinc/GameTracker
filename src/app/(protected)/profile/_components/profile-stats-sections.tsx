"use client";

import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import {
  Flame,
  Gamepad2,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import GameTitleImage from "@/components/game/game-title-image";
import { ProfileMatchupSelector } from "@/components/profile/profile-matchup-selector";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProfileStatsPageData } from "../profile-types";

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
  const selectedComparisonStyles = useMemo(
    () =>
      buildAccentStyles(selectedComparison?.user.color ?? data.profile.color),
    [data.profile.color, selectedComparison?.user.color],
  );

  const isBestFriendSelected =
    Boolean(data.defaultBestFriend) &&
    selectedComparisonUserId === data.defaultBestFriend?.id;

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
        <Card className="overflow-hidden rounded-[2rem] border border-border/70 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
          <CardContent className="px-5 py-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground dark:text-white/60">
                  Matchup
                </p>
              </div>
            </div>

            {data.comparisonOptions.length > 0 ? (
              <div className="mt-5">
                <ProfileMatchupSelector
                  options={data.comparisonOptions}
                  selectedUserId={selectedComparisonUserId}
                  onSelect={setSelectedComparisonUserId}
                  defaultBestFriendId={data.defaultBestFriend?.id ?? null}
                />
              </div>
            ) : null}

            {selectedComparison ? (
              <div className="mt-5 space-y-5">
                <div
                  className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-[linear-gradient(135deg,var(--profile-accent-glow),var(--profile-accent-soft)_34%,rgba(255,255,255,0.96)_72%,rgba(248,250,252,0.92)_100%)] dark:border-white/10 dark:bg-[linear-gradient(135deg,var(--profile-accent-panel),rgba(255,255,255,0.08)_28%,rgba(20,24,34,0.9)_64%,rgba(10,14,24,0.96)_100%)]"
                  style={{
                    ...selectedComparisonStyles,
                  }}
                >
                  <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                    <div className="flex min-w-0 items-center gap-4">
                      <ProfilePicture
                        user={selectedComparison.user}
                        size="md"
                        linkToProfile
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-2xl font-black text-foreground dark:text-white">
                            {selectedComparison.user.displayName}
                            {selectedComparison.user.isGuest ? " (Guest)" : ""}
                          </p>
                          {isBestFriendSelected ? (
                            <Badge
                              variant="outline"
                              className="rounded-full dark:border-white/10 dark:bg-white/8 dark:text-white"
                            >
                              Best friend
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] bg-slate-950 px-5 py-4 text-white shadow-lg dark:bg-white dark:text-slate-950">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55 dark:text-slate-500">
                        Record
                      </p>
                      <p className="mt-2 text-4xl font-black tracking-tight">
                        {selectedComparison.wins}-{selectedComparison.losses}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-3">
                  <div className="flex flex-col justify-between rounded-[1.5rem] border border-border/70 bg-muted/50 p-4 text-center dark:border-white/10 dark:bg-white/6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-white/60">
                      Win rate
                    </p>
                    <p className="mt-2 text-xl font-black text-foreground dark:text-white">
                      {formatPercent(selectedComparison.winRate)}
                    </p>
                  </div>
                  <div className="flex flex-col justify-between rounded-[1.5rem] border border-border/70 bg-muted/50 p-4 text-center dark:border-white/10 dark:bg-white/6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-white/60">
                      Games
                    </p>
                    <p className="mt-2 text-xl font-black text-foreground dark:text-white">
                      {selectedComparison.completedGamesTogether}
                    </p>
                  </div>
                  <div className="flex flex-col justify-between rounded-[1.5rem] border border-border/70 bg-muted/50 p-4 text-center dark:border-white/10 dark:bg-white/6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-white/60">
                      Streak against
                    </p>
                    <p className="mt-2 text-xl font-black text-foreground dark:text-white">
                      {formatStreak(
                        selectedComparison.currentStreak.type,
                        selectedComparison.currentStreak.count,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[1.5rem] border border-dashed border-border/70 bg-muted/35 p-5 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/4 dark:text-white/68">
                No matchup card yet. Finish a few games with friends and this
                section will light up.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
