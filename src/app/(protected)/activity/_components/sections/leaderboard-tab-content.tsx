"use client";

import Link from "next/link";
import {
  CalendarRange,
  ChevronDown,
  Clock3,
  Sparkles,
  Trophy,
} from "lucide-react";
import { getProfileColorSurfaceStyles } from "@/components/profile/profile-color-styles";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardEmpty } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useActivityPage } from "../activity-page-provider";
import { buttonVariants } from "@/components/ui/button";

function getHeadlineIcon(kind: "rank" | "wins" | "volume" | "idle") {
  if (kind === "rank") {
    return Sparkles;
  }

  if (kind === "wins") {
    return Trophy;
  }

  if (kind === "volume") {
    return CalendarRange;
  }

  return Clock3;
}

export function LeaderboardTabContent() {
  const { data, expandedFriendId, toggleExpandedFriendId } = useActivityPage();

  return (
    <Card className="overflow-visible border-none bg-transparent shadow-none">
      <CardContent className="flex flex-col gap-3 px-0">
        {data.leaderboardFriends.length === 0 ? (
          <CardEmpty>No friends yet to rank</CardEmpty>
        ) : (
          data.leaderboardFriends.map((friend, index) => {
            const surfaceStyles = getProfileColorSurfaceStyles(
              friend.user.color,
            );
            const displayName =
              [friend.user.firstName, friend.user.lastName]
                .filter(Boolean)
                .join(" ") || "Unnamed player";
            const isExpanded = expandedFriendId === friend.user.id;
            const hasNoActivity =
              friend.playerRankTotalMinor === 0 &&
              friend.playerRankGamesCount === 0 &&
              friend.recentActivityCount === 0;
            const showNoActivityLabel =
              hasNoActivity &&
              (index === 0 ||
                !(
                  data.leaderboardFriends[index - 1]?.playerRankTotalMinor ===
                    0 &&
                  data.leaderboardFriends[index - 1]?.playerRankGamesCount ===
                    0 &&
                  data.leaderboardFriends[index - 1]?.recentActivityCount === 0
                ));

            return (
              <div key={friend.user.id} className="space-y-2">
                {showNoActivityLabel ? (
                  <div className="px-2">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      No Activity
                    </p>
                  </div>
                ) : null}
                <div
                  className={cn(
                    "relative w-full overflow-hidden rounded-3xl text-left shadow-sm transition-transform hover:scale-[1.01]",
                    hasNoActivity && "opacity-70 saturate-[0.85]",
                  )}
                  style={surfaceStyles}
                  onClick={() => toggleExpandedFriendId(friend.user.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleExpandedFriendId(friend.user.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="pointer-events-none absolute inset-[1px] rounded-[calc(1.5rem-1px)] border border-[var(--profile-surface-ring)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,var(--profile-surface-highlight)_0%,transparent_52%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(15,23,42,0.18)_0%,transparent_52%)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_100%)]" />
                  <div className="relative flex items-center gap-3 px-3 py-1">
                    <div
                      className="relative z-10 flex shrink-0 items-center justify-center"
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
                        content={
                          hasNoActivity ? null : (
                            <span className="font-bold text-xl">
                              #{friend.friendPosition}
                            </span>
                          )
                        }
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <p className="truncate text-lg font-black text-[color:var(--profile-surface-text)]">
                          {displayName}
                        </p>
                        {!hasNoActivity && (
                          <div className="mt-1 text-xs">
                            {friend.headlineStat.label}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-3xl font-black leading-none text-[color:var(--profile-surface-text)]">
                          {hasNoActivity ? "--" : friend.playerRankTotal}
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "size-5 shrink-0 text-[color:var(--profile-surface-muted-text)] transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </div>
                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-out",
                      isExpanded
                        ? "visible grid-rows-[1fr] opacity-100 pt-2"
                        : "invisible grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="relative mx-3 mb-3 rounded-[1.4rem] border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] p-4 backdrop-blur-[2px]">
                        <div className="mb-3">
                          <Link
                            href={`/profile/${friend.user.id}`}
                            className={cn(
                              buttonVariants({
                                variant: "outline",
                                size: "sm",
                              }),
                              "w-full justify-center border-[var(--profile-surface-panel-border)] bg-[color:var(--profile-surface-highlight)] text-[color:var(--profile-surface-text)] hover:bg-[var(--profile-surface-panel)]",
                            )}
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            View Profile
                          </Link>
                        </div>
                        <div className="grid gap-3 grid-cols-3">
                          <div className="rounded-2xl text-center border border-[var(--profile-surface-panel-border)] bg-[color:var(--profile-surface-highlight)] px-3 py-3">
                            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[color:var(--profile-surface-muted-text)]">
                              Global Rank
                            </p>
                            <p className="mt-1 text-2xl font-black leading-none text-[color:var(--profile-surface-text)]">
                              {friend.globalPosition
                                ? `#${friend.globalPosition}`
                                : "Unranked"}
                            </p>
                          </div>
                          <div className="rounded-2xl text-center border border-[var(--profile-surface-panel-border)] bg-[color:var(--profile-surface-highlight)] px-3 py-3">
                            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[color:var(--profile-surface-muted-text)]">
                              Ranked Games
                            </p>
                            <p className="mt-1 text-2xl font-black leading-none text-[color:var(--profile-surface-text)]">
                              {friend.playerRankGamesCount}
                            </p>
                          </div>
                          <div className="rounded-2xl text-center border border-[var(--profile-surface-panel-border)] bg-[color:var(--profile-surface-highlight)] px-3 py-3 sm:col-span-2">
                            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[color:var(--profile-surface-muted-text)]">
                              Top 3 Finishes
                            </p>
                            <p className="mt-1 text-2xl font-black leading-none text-[color:var(--profile-surface-text)]">
                              {friend.topThreeFinishes}
                            </p>
                          </div>
                        </div>
                        {!hasNoActivity ? (
                          <div className="mt-4 flex flex-col gap-2">
                            {friend.supportingStats.map((stat) => (
                              <p
                                key={stat}
                                className="text-sm text-[color:var(--profile-surface-muted-text)]"
                              >
                                {stat}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
