"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import { PlayerRankTrendCard } from "@/components/player-rank/player-rank-trend-card";
import ProfilePicture from "@/components/profile/profile-picture";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardEmpty } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useActivityPage } from "../activity-page-provider";
import type { ActivityLeaderboardFriend } from "../leaderboard-utils";

function getDisplayName(friend: ActivityLeaderboardFriend) {
  const firstName = friend.user.firstName?.trim() ?? "";
  const lastInitial = friend.user.lastName?.trim().charAt(0) ?? "";

  if (firstName && lastInitial) {
    return `${firstName} ${lastInitial}.`;
  }

  if (firstName) {
    return firstName;
  }

  if (lastInitial) {
    return `${lastInitial}.`;
  }

  return "Unnamed player";
}

function getOrdinalLabel(position: number) {
  const mod100 = position % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${position}th`;
  }

  const mod10 = position % 10;
  if (mod10 === 1) {
    return `${position}st`;
  }

  if (mod10 === 2) {
    return `${position}nd`;
  }

  if (mod10 === 3) {
    return `${position}rd`;
  }

  return `${position}th`;
}

function hasNoActivity(friend: ActivityLeaderboardFriend) {
  return (
    friend.playerRankTotalMinor === 0 &&
    friend.playerRankGamesCount === 0 &&
    friend.recentActivityCount === 0
  );
}

function getPodiumPlacementBadge(position: number) {
  if (position === 1) {
    return {
      className: "placement-badge",
      style: {} satisfies CSSProperties,
      trophyClassName: "",
    };
  }

  if (position === 2) {
    return {
      className: "placement-badge",
      style: {
        ["--placement-surface-soft" as string]: "oklch(0.985 0.006 255)",
        ["--placement-surface-strong" as string]: "oklch(0.84 0.02 255)",
        ["--placement-border" as string]: "oklch(0.73 0.018 255)",
        ["--placement-text" as string]: "oklch(0.39 0.02 255)",
        ["--placement-shadow" as string]:
          "0 18px 38px -24px rgba(100, 116, 139, 0.45)",
        ["--placement-surface-soft-dark" as string]: "oklch(0.34 0.015 255)",
        ["--placement-surface-strong-dark" as string]: "oklch(0.49 0.02 255)",
        ["--placement-border-dark" as string]: "oklch(0.62 0.018 255)",
        ["--placement-text-dark" as string]: "oklch(0.96 0.006 255)",
        ["--placement-shadow-dark" as string]:
          "0 18px 38px -24px rgba(15, 23, 42, 0.65)",
      } satisfies CSSProperties,
      trophyClassName: "",
    };
  }

  return {
    className: "placement-badge",
    style: {
      ["--placement-surface-soft" as string]: "oklch(0.985 0.018 60)",
      ["--placement-surface-strong" as string]: "oklch(0.8 0.065 55)",
      ["--placement-border" as string]: "oklch(0.69 0.075 53)",
      ["--placement-text" as string]: "oklch(0.41 0.06 48)",
      ["--placement-shadow" as string]:
        "0 18px 38px -24px rgba(180, 103, 47, 0.48)",
      ["--placement-surface-soft-dark" as string]: "oklch(0.34 0.03 55)",
      ["--placement-surface-strong-dark" as string]: "oklch(0.48 0.06 52)",
      ["--placement-border-dark" as string]: "oklch(0.63 0.07 52)",
      ["--placement-text-dark" as string]: "oklch(0.95 0.02 70)",
      ["--placement-shadow-dark" as string]:
        "0 18px 38px -24px rgba(67, 20, 7, 0.62)",
    } satisfies CSSProperties,
    trophyClassName: "",
  };
}

function getPodiumAccent(position: number) {
  if (position === 1) {
    return {
      cardClassName:
        "border-amber-300/70 bg-[linear-gradient(180deg,#fff8eb_0%,#fff1cf_100%)] shadow-amber-950/10 dark:border-amber-200/20 dark:bg-[linear-gradient(180deg,rgba(245,158,11,0.18)_0%,rgba(255,255,255,0.03)_100%)]",
      heightClassName: "h-56",
    };
  }

  if (position === 2) {
    return {
      cardClassName:
        "border-slate-300/70 bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] shadow-slate-950/10 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(148,163,184,0.2)_0%,rgba(255,255,255,0.03)_100%)]",
      heightClassName: "h-48",
    };
  }

  return {
    cardClassName:
      "border-orange-300/70 bg-[linear-gradient(180deg,#fff7ed_0%,#ffedd5_100%)] shadow-orange-950/10 dark:border-orange-300/20 dark:bg-[linear-gradient(180deg,rgba(249,115,22,0.16)_0%,rgba(255,255,255,0.03)_100%)]",
    heightClassName: "h-44",
  };
}

function LeaderboardDetailPanel({
  friend,
  onClick,
}: {
  friend: ActivityLeaderboardFriend;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      className="mx-3 mb-3 rounded-[1.4rem] border border-border/70 bg-card p-4"
      onClick={onClick}
    >
      <div className="mb-3">
        <Link
          href={`/profile/${friend.user.id}`}
          className={cn(
            buttonVariants({
              variant: "outline",
              size: "sm",
            }),
            "w-full justify-center",
          )}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {friend.isCurrentUser ? "View Your Profile" : "View Profile"}
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border/70 bg-muted/40 px-3 py-3 text-center">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Recent Activity
          </p>
          <p className="mt-1 text-2xl font-black leading-none text-foreground">
            {friend.recentActivityCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/40 px-3 py-3 text-center">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Ranked Games
          </p>
          <p className="mt-1 text-2xl font-black leading-none text-foreground">
            {friend.playerRankGamesCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/40 px-3 py-3 text-center sm:col-span-2">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Top 3 Finishes
          </p>
          <p className="mt-1 text-2xl font-black leading-none text-foreground">
            {friend.topThreeFinishes}
          </p>
        </div>
      </div>
      {!hasNoActivity(friend) ? (
        <div className="mt-4 flex flex-col gap-2">
          {friend.supportingStats.map((stat) => (
            <p key={stat} className="text-sm text-muted-foreground">
              {stat}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PodiumCard({
  friend,
}: {
  friend: ActivityLeaderboardFriend;
}) {
  const accent = getPodiumAccent(friend.friendPosition);
  const placementBadge = getPodiumPlacementBadge(friend.friendPosition);
  const entryHasNoActivity = hasNoActivity(friend);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center rounded-[1.4rem] border px-2 py-3 text-center shadow-lg",
        accent.cardClassName,
        accent.heightClassName,
        entryHasNoActivity && "opacity-70 saturate-[0.85]",
      )}
      aria-label={`${getOrdinalLabel(friend.friendPosition)} place ${getDisplayName(friend)}`}
    >
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm",
          placementBadge.className,
        )}
        style={placementBadge.style}
      >
        <Trophy className={cn("size-3.5", placementBadge.trophyClassName)} />
        <span>{getOrdinalLabel(friend.friendPosition)}</span>
      </div>
      <div className="mt-3">
        <ProfilePicture
          user={friend.user}
          className="border-none"
          linkToProfile
          size={friend.friendPosition === 1 ? "md" : "sm"}
        />
      </div>
      <p
        className={cn(
          "mt-2 line-clamp-2 font-black text-foreground",
          friend.friendPosition === 1 ? "text-base" : "text-sm",
        )}
      >
        {getDisplayName(friend)}
      </p>
      <p
        className={cn(
          "mt-2 font-black leading-none text-foreground",
          friend.friendPosition === 1 ? "text-3xl" : "text-2xl",
        )}
      >
        {entryHasNoActivity ? "--" : friend.playerRankTotal}
      </p>
    </div>
  );
}

function LeaderboardListRow({
  friend,
  isExpanded,
  onToggle,
}: {
  friend: ActivityLeaderboardFriend;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const displayName = getDisplayName(friend);
  const entryHasNoActivity = hasNoActivity(friend);

  return (
    <Card
      className={cn(
        "w-full gap-0 overflow-hidden rounded-3xl bg-card py-0 text-left transition-transform hover:scale-[1.01]",
        entryHasNoActivity && "opacity-70 saturate-[0.85]",
      )}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={displayName}
    >
      <div className="flex min-h-14 items-center gap-3 px-3 py-2">
        <div
          className="flex shrink-0 items-center justify-center"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
        >
          <ProfilePicture
            user={friend.user}
            className="border-none"
            linkToProfile
            size="sm"
          />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <div className="flex items-center gap-2">
              {!entryHasNoActivity ? (
                <span className="text-sm font-black text-muted-foreground">
                  #{friend.friendPosition}
                </span>
              ) : null}
              <p className="truncate text-lg font-black text-foreground">
                {displayName}
              </p>
            </div>
            {!entryHasNoActivity ? (
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{friend.headlineStat.label}</span>
              </div>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-black leading-none text-foreground">
              {entryHasNoActivity ? "--" : friend.playerRankTotal}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform",
              isExpanded && "rotate-180",
            )}
          />
        </div>
      </div>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          isExpanded
            ? "visible grid-rows-[1fr] pt-2 opacity-100"
            : "invisible grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <LeaderboardDetailPanel friend={friend} />
        </div>
      </div>
    </Card>
  );
}

export function LeaderboardTabContent() {
  const { data, expandedFriendId, toggleExpandedFriendId } = useActivityPage();
  const podiumFriends = data.leaderboardFriends.slice(0, 3);
  const podiumDisplayFriends = [
    podiumFriends.find((friend) => friend.friendPosition === 3),
    podiumFriends.find((friend) => friend.friendPosition === 1),
    podiumFriends.find((friend) => friend.friendPosition === 2),
  ].filter((friend): friend is ActivityLeaderboardFriend => Boolean(friend));

  return (
    <div className="pt-2">
      <CardContent className="flex flex-col gap-4 px-0">
        {data.playerRankTrend ? (
          <PlayerRankTrendCard
            href="/player-rank"
            user={data.user}
            color={data.user.color}
            rankPosition={data.playerRankTrend.rankPosition}
            rankTotal={data.playerRankTrend.rankTotal}
            chartPoints={data.playerRankTrend.chartPoints}
            hasHistory={data.playerRankTrend.hasHistory}
          />
        ) : null}
        {data.leaderboardFriends.length === 0 ? (
          <CardEmpty>No friends yet to rank</CardEmpty>
        ) : (
          <>
            <section aria-label="Leaderboard podium" className="px-1">
              <div
                className={cn(
                  "grid items-end gap-2",
                  podiumDisplayFriends.length === 1 &&
                    "mx-auto max-w-[12rem] grid-cols-1",
                  podiumDisplayFriends.length === 2 && "grid-cols-2",
                  podiumDisplayFriends.length >= 3 && "grid-cols-3",
                )}
              >
                {podiumDisplayFriends.map((friend) => (
                  <PodiumCard key={friend.user.id} friend={friend} />
                ))}
              </div>
            </section>

            {data.leaderboardFriends.map((friend, index) => {
              const showNoActivityLabel =
                hasNoActivity(friend) &&
                (index === 0 ||
                  !hasNoActivity(data.leaderboardFriends[index - 1]!));

              return (
                <div key={friend.user.id} className="space-y-2">
                  {showNoActivityLabel ? (
                    <div className="px-2">
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                        No Activity
                      </p>
                    </div>
                  ) : null}
                  <LeaderboardListRow
                    friend={friend}
                    isExpanded={expandedFriendId === friend.user.id}
                    onToggle={() => toggleExpandedFriendId(friend.user.id)}
                  />
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </div>
  );
}
