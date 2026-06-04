"use client";

import Link from "next/link";
import { Trophy, Users } from "lucide-react";
import ProfilePicture from "@/components/profile/profile-picture";
import {
  Card,
  CardContent,
  CardEmpty,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFriendsPage } from "../friends-page-provider";
import {
  formatActivityDay,
  formatActivityTime,
  getActivityDisplayName,
  getActivityShortName,
  type FriendActivityItem,
} from "../utils";

type ActivityGroup = {
  dayLabel: string;
  entries: FriendActivityItem[];
};

function getWinnerSummary(
  game: FriendActivityItem,
  currentUserId: string,
) {
  if (game.winners.length === 0) {
    return "No winner recorded yet";
  }

  if (game.winners.length === 1) {
    const winner = game.winners[0];
    return `${getActivityDisplayName({
      id: winner.user.id,
      firstName: winner.user.firstName,
      lastName: winner.user.lastName,
      currentUserId,
    })} won`;
  }

  return `${game.winners.length} winners recorded`;
}

function getPlayedBySummary(
  game: FriendActivityItem,
  currentUserId: string,
  friendIds: Set<string>,
) {
  const includesCurrentUser = game.players.some(
    (player) => player.userId === currentUserId,
  );
  const friendLabels = game.players
    .filter((player) => friendIds.has(player.userId))
    .map((player) =>
      getActivityShortName({
        id: player.user.id,
        firstName: player.user.firstName,
        lastName: player.user.lastName,
        currentUserId,
      }),
    );
  const labels = includesCurrentUser
    ? [
        "You",
        ...friendLabels.filter((label) => label !== "You"),
      ]
    : friendLabels;

  if (labels.length === 0) {
    return "Your friends";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  if (labels.length === 3) {
    return `${labels[0]}, ${labels[1]}, and ${labels[2]}`;
  }

  return `${labels[0]}, ${labels[1]}, and ${labels.length - 2} others`;
}

function groupActivity(
  games: FriendActivityItem[],
) {
  const groups: ActivityGroup[] = [];

  for (const game of games) {
    const dayLabel = formatActivityDay(game.completedAt ?? game.createdAt);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.dayLabel === dayLabel) {
      lastGroup.entries.push(game);
      continue;
    }

    groups.push({
      dayLabel,
      entries: [game],
    });
  }

  return groups;
}

export function FriendActivityCard() {
  const { data } = useFriendsPage();
  const groups = groupActivity(data.friendActivity);
  const friendIds = new Set(data.friends.map((friend) => friend.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <CardEmpty>No friend activity in the last 30 days</CardEmpty>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <div key={group.dayLabel} className="flex flex-col gap-2">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {group.dayLabel}
                </p>
                <div className="flex flex-col gap-2">
                  {group.entries.map((game) => {
                    const includesCurrentUser = game.players.some(
                      (player) => player.userId === data.user.id,
                    );

                    return (
                      <div
                        key={game.id}
                        className={cn(
                          "flex w-full flex-col gap-1",
                          includesCurrentUser ? "items-end" : "items-start",
                        )}
                      >
                        <p
                          className={cn(
                            "max-w-[85%] px-1 text-xs leading-relaxed text-muted-foreground",
                            includesCurrentUser ? "text-right" : "text-left",
                          )}
                        >
                          <span className="font-medium text-foreground">
                            {getPlayedBySummary(game, data.user.id, friendIds)}
                          </span>{" "}
                          played{" "}
                          <span className="font-medium text-foreground">
                            {game.gameTitle?.title ?? "New Game"}
                          </span>
                          <span className="ml-2 text-[11px]">
                            {formatActivityDay(game.completedAt ?? game.createdAt)}
                            {formatActivityTime(game.completedAt ?? game.createdAt)
                              ? ` at ${formatActivityTime(game.completedAt ?? game.createdAt)}`
                              : ""}
                          </span>
                        </p>
                        <Link
                          href={`/game/${game.id}/play`}
                          className={cn(
                            "relative w-full max-w-[85%] overflow-hidden rounded-2xl border border-border/70 px-3 py-3 transition-colors hover:bg-muted/80",
                          )}
                          style={{
                            backgroundColor: game.gameTitle?.color ?? undefined,
                          }}
                        >
                          {game.gameTitle?.imageUrl ? (
                            <>
                              <div
                                className="absolute inset-0 scale-105 bg-cover bg-center opacity-45 blur-[3px]"
                                style={{
                                  backgroundImage: `url("${game.gameTitle.imageUrl}")`,
                                }}
                              />
                              <div className="absolute inset-0 bg-background/80" />
                            </>
                          ) : null}
                          <div className="relative z-10 flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                              <Trophy className="size-3.5 shrink-0" />
                              <span className="truncate">
                                {getWinnerSummary(game, data.user.id)}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <div className="flex -space-x-2">
                                {game.players.slice(0, 4).map((player) => (
                                  <ProfilePicture
                                    key={player.id}
                                    user={player.user}
                                    size="xs"
                                    className="ring-2 ring-background"
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Users className="size-3.5" />
                                <span>{game.players.length}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
