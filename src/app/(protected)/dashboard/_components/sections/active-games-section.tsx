"use client";

import {
  sectionActionClassName,
  sectionItemClassName,
  sectionItemMetaClassName,
  sectionItemTitleClassName,
} from "@/components/ui/section-styles";
import {
  Card,
  CardAction,
  CardContent,
  CardEmpty,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useDashboardPage } from "../dashboard-page-provider";
import { GamePlayerStack } from "../controls/game-player-stack";
import { formatGameDate, getPlayerLabel } from "../utils";

export function ActiveGamesSection() {
  const { recentActiveGames, user } = useDashboardPage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Continue Playing</CardTitle>
        <CardAction>
          <Link
            href="/game/history?status=active"
            className={sectionActionClassName}
          >
            View all
            <ArrowRight />
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {recentActiveGames.length === 0 ? (
          <CardEmpty className="flex flex-col items-center gap-3">
            <p>No active games yet.</p>
            <Link href="/game/create/settings" className={sectionActionClassName}>
              Start a game
              <ArrowRight />
            </Link>
          </CardEmpty>
        ) : (
          recentActiveGames.map((game) => (
            <Link
              key={`active-game-${game.id}`}
              href={`/game/${game.id}/play`}
              className={cn(
                sectionItemClassName,
                "transition-colors hover:bg-muted",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <h3
                  className={cn("min-w-0 truncate", sectionItemTitleClassName)}
                >
                  {game.gameTitle?.title ?? "New Game"}
                </h3>
                <div
                  className={cn(
                    "flex shrink-0 items-center gap-1",
                    sectionItemMetaClassName,
                  )}
                >
                  <CalendarDays className="size-3.5" />
                  <span>{formatGameDate(game.createdAt)}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <GamePlayerStack players={game.players} />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate", sectionItemMetaClassName)}>
                    {game.players
                      .map((player) => getPlayerLabel(player, user.id))
                      .join(", ")}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
