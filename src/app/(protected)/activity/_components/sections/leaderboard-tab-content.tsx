"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PlayerRankPodium } from "@/components/player-rank/player-rank-podium";
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

function hasNoActivity(friend: ActivityLeaderboardFriend) {
  return (
    friend.playerRankTotalMinor === 0 &&
    friend.playerRankGamesCount === 0 &&
    friend.recentActivityCount === 0
  );
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
            <PlayerRankPodium
              ariaLabel="Leaderboard podium"
              entries={podiumFriends.map((friend) => ({
                id: friend.user.id,
                position: friend.friendPosition,
                displayName: getDisplayName(friend),
                value: hasNoActivity(friend) ? "--" : friend.playerRankTotal,
                user: friend.user,
                linkToProfile: true,
                subdued: hasNoActivity(friend),
              }))}
            />

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
