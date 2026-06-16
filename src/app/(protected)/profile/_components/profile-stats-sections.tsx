"use client";

import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import {
  BadgeCheck,
  Flame,
  Gamepad2,
  Orbit,
  Search,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
      <CardContent className="relative flex min-h-30 flex-col items-center justify-center gap-3 px-4 py-3 text-center sm:min-h-32 sm:px-5 sm:py-3.5">
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

function MatchupSelector(props: {
  options: ProfileStatsPageData["comparisonOptions"];
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
  defaultBestFriendId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const selected =
    props.options.find((option) => option.id === props.selectedUserId) ?? null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-auto w-full justify-between rounded-[1.5rem] border-border/70 bg-background/80 px-4 py-3 shadow-none hover:bg-muted/60 dark:border-white/10 dark:bg-white/6 dark:hover:bg-white/10"
        onClick={() => setOpen(true)}
      >
        <div className="flex min-w-0 items-center gap-3">
          {selected ? <ProfilePicture user={selected} size="sm" /> : null}
          <div className="min-w-0 text-left">
            <p className="truncate text-base font-semibold text-foreground dark:text-white">
              {selected
                ? `${selected.displayName}${selected.isGuest ? " (Guest)" : ""}`
                : "Choose a matchup"}
            </p>
            <p className="text-xs font-medium text-muted-foreground dark:text-white/60">
              Search players
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {props.defaultBestFriendId &&
          props.selectedUserId === props.defaultBestFriendId ? (
            <Badge
              variant="outline"
              className="rounded-full dark:border-white/10 dark:bg-white/8 dark:text-white"
            >
              Best friend
            </Badge>
          ) : null}
          <Search className="size-4 text-muted-foreground dark:text-white/60" />
        </div>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Choose a matchup"
        description="Search friends and guests to compare competition stats."
        showCloseButton
      >
        <Command className="bg-popover">
          <CommandInput placeholder="Search players" />
          <CommandList className="max-h-96">
            <CommandEmpty>No players found.</CommandEmpty>
            <CommandGroup heading="Players">
              {props.options.map((option) => {
                const isSelected = option.id === props.selectedUserId;
                const label = option.isGuest
                  ? `${option.displayName} (Guest)`
                  : option.displayName;

                return (
                  <CommandItem
                    key={option.id}
                    value={`${label} ${option.id}`}
                    data-checked={isSelected ? "true" : undefined}
                    onSelect={() => {
                      props.onSelect(option.id);
                      setOpen(false);
                    }}
                  >
                    <ProfilePicture user={option} size="xs" />
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate font-medium">{label}</span>
                      {props.defaultBestFriendId === option.id ? (
                        <Badge variant="outline" className="rounded-full">
                          Best friend
                        </Badge>
                      ) : null}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

export function ProfileStatsSections({ data }: { data: ProfileStatsPageData }) {
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
                  Recent
                </p>
                <h2 className="text-2xl font-black tracking-tight text-foreground dark:text-white sm:text-[2.1rem]">
                  {data.stats.storyline.label}
                </h2>
              </div>
              <div
                className="mt-4 flex size-12 shrink-0 items-center justify-center rounded-[1.25rem] border dark:border-white/10"
                style={{
                  backgroundColor: "var(--profile-accent-panel)",
                  borderColor: "var(--profile-accent-line)",
                }}
              >
                <Orbit className="size-5 text-foreground dark:text-white" />
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
            <div className="relative min-h-[16.5rem] bg-slate-950 text-white sm:min-h-[18rem]">
              {data.stats.signatureTitle.imageUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-70 transition-transform duration-500 group-hover:scale-[1.03]"
                  style={{
                    backgroundImage: `url("${data.stats.signatureTitle.imageUrl}")`,
                  }}
                />
              ) : null}
              <div
                className="absolute -top-20 right-[-4rem] size-64 rounded-full blur-3xl"
                style={{ backgroundColor: "var(--profile-accent-glow)" }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.14)_0%,rgba(15,23,42,0.34)_38%,rgba(15,23,42,0.9)_100%)]" />
              <div className="relative flex min-h-[16.5rem] flex-col justify-between p-5 sm:min-h-[18rem] sm:p-6">
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
            </div>
          </Link>
        ) : (
          <Card className="overflow-hidden rounded-[2rem] border border-border/70 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
            <CardContent className="relative p-6">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg,var(--profile-accent-soft),transparent 52%), linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))",
                }}
              />
              <div className="relative space-y-3">
                <Badge
                  variant="outline"
                  className="rounded-full dark:border-white/10 dark:bg-white/6 dark:text-white/88"
                >
                  Signature title
                </Badge>
                <h2 className="text-3xl font-black tracking-tight text-foreground dark:text-white">
                  Title energy coming soon
                </h2>
                <p className="max-w-xl text-sm text-muted-foreground dark:text-white/72">
                  Finish a few more games and this space will pick up some
                  color.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
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
                <MatchupSelector
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

        <div className="grid gap-4">
          <Card className="overflow-hidden rounded-[2rem] border border-border/70 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
            <CardContent className="space-y-4 px-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-11 items-center justify-center rounded-2xl border dark:border-white/10"
                  style={{
                    backgroundColor: "var(--profile-accent-soft)",
                    borderColor: "var(--profile-accent-line)",
                  }}
                >
                  <BadgeCheck className="size-5 text-foreground dark:text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground dark:text-white/60">
                    Last matchup
                  </p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-foreground dark:text-white">
                    {selectedComparison
                      ? formatDate(selectedComparison.lastPlayedAt)
                      : "Not yet"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[2rem] border border-border/70 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
            <CardContent className="space-y-4 px-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-foreground dark:bg-white/8 dark:text-white">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground dark:text-white/60">
                    Friends
                  </p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-foreground dark:text-white">
                    {data.stats.friendCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
