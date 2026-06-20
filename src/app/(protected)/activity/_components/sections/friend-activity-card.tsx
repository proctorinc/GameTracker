"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Users } from "lucide-react";
import GameTitleImage from "@/components/game/game-title-image";
import ProfilePicture from "@/components/profile/profile-picture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardEmpty } from "@/components/ui/card";
import { getPlayersOrderedByPlacement } from "@/app/(protected)/dashboard/_components/utils";
import { cn } from "@/lib/utils";
import { useActivityPage } from "../activity-page-provider";
import {
  formatActivityDay,
  formatActivityTime,
  getActivityDisplayName,
  getActivityShortName,
  useClientDateFormatting,
} from "../utils";

function getWinnerSummary(
  game: ReturnType<typeof useActivityPage>["data"]["friendActivity"][number],
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
      currentUserId,
    })} won`;
  }

  return `${game.winners.length} winners recorded`;
}

function getPlayedBySummary(
  game: ReturnType<typeof useActivityPage>["data"]["friendActivity"][number],
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
    ? ["You", ...friendLabels.filter((label) => label !== "You")]
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

  return `${labels[0]}, and ${labels.length - 1} others`;
}

const ACTIVITY_CHUNK_DAYS = 7;
const ACTIVITY_CHUNK_SIZE = 20;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getActivityChunkEndIndex(
  games: ReturnType<typeof useActivityPage>["data"]["friendActivity"],
  startIndex: number,
) {
  const chunkStart = games[startIndex];

  if (!chunkStart) {
    return startIndex;
  }

  const chunkStartTime = new Date(chunkStart.createdAt).getTime();
  const chunkEndBoundary =
    chunkStartTime - (ACTIVITY_CHUNK_DAYS - 1) * DAY_IN_MS;
  let endIndex = startIndex;

  while (endIndex < games.length) {
    if (endIndex - startIndex >= ACTIVITY_CHUNK_SIZE) {
      break;
    }

    const activityTime = new Date(games[endIndex].createdAt).getTime();

    if (activityTime < chunkEndBoundary) {
      break;
    }

    endIndex += 1;
  }

  return endIndex;
}

function groupActivity(
  games: ReturnType<typeof useActivityPage>["data"]["friendActivity"],
  dateFormatting: Parameters<typeof formatActivityDay>[1],
) {
  const groups: Array<{
    dayLabel: string;
    entries: ReturnType<typeof useActivityPage>["data"]["friendActivity"];
  }> = [];

  for (const game of games) {
    const dayLabel = formatActivityDay(game.createdAt, dateFormatting);
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
  const { data } = useActivityPage();
  const dateFormatting = useClientDateFormatting();
  const friendIds = new Set(data.friends.map((friend) => friend.id));
  const [visibleCount, setVisibleCount] = useState(() =>
    getActivityChunkEndIndex(data.friendActivity, 0),
  );

  useEffect(() => {
    setVisibleCount(getActivityChunkEndIndex(data.friendActivity, 0));
  }, [data.friendActivity]);

  const visibleActivity = data.friendActivity.slice(0, visibleCount);
  const groups = groupActivity(visibleActivity, dateFormatting);
  const hasMoreActivity = visibleCount < data.friendActivity.length;

  return (
    <Card className="flex-1">
      <CardContent className="flex flex-1 flex-col">
        {groups.length === 0 ? (
          <CardEmpty className="flex flex-1 items-center justify-center">
            No friend activity in the last 30 days
          </CardEmpty>
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
                    const orderedPlayers = getPlayersOrderedByPlacement(game);
                    const activityTime = formatActivityTime(
                      game.createdAt,
                      dateFormatting,
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
                            "max-w-[85%] px-1 text-xs leading-relaxed text-foreground/84",
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
                          <span className="text-[11px]">
                            {activityTime ? ` at ${activityTime}` : ""}
                          </span>
                        </p>
                        <Link
                          href={`/game/${game.id}/play`}
                          className="block w-full max-w-[85%]"
                        >
                          <GameTitleImage
                            className="rounded-2xl border border-border/70 px-3 py-3 transition-colors hover:bg-muted/80"
                            color={game.gameTitle?.color}
                            imageUrl={game.gameTitle?.imageUrl}
                            variant="card"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2 text-xs text-white">
                                <Trophy className="size-3.5 shrink-0" />
                                <span className="truncate font-bold">
                                  {getWinnerSummary(game, data.user.id)}
                                </span>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <div className="flex -space-x-2">
                                  {orderedPlayers.slice(0, 4).map((player) => (
                                    <ProfilePicture
                                      key={player.id}
                                      user={player.user}
                                      size="xs"
                                      className="ring-2 ring-background"
                                    />
                                  ))}
                                </div>
                                <div className="flex items-center gap-1 text-[11px] font-bold text-white/88">
                                  <Users className="size-3.5" />
                                  <span>{game.players.length}</span>
                                </div>
                              </div>
                            </div>
                          </GameTitleImage>
                        </Link>
                        {game.currentUserRankDelta &&
                        game.currentUserRankDelta.deltaMinor !== 0 ? (
                          <p className="max-w-[85%] px-1 text-right text-[11px] font-semibold text-muted-foreground">
                            {game.currentUserRankDelta.deltaFormatted} Rank
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {hasMoreActivity ? (
              <Button
                variant="outline"
                size="sm"
                className="self-center px-4"
                onClick={() => {
                  setVisibleCount((currentCount) =>
                    getActivityChunkEndIndex(data.friendActivity, currentCount),
                  );
                }}
              >
                Show more
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
