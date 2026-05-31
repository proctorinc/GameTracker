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
import ProfilePicture from "@/components/profile/profile-picture";
import { WinnerIndicator } from "@/components/ui/winner-indicator";
import { cn } from "@/lib/utils";
import { ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";
import { GamePlayerStack } from "../controls/game-player-stack";
import { useDashboardPage } from "../dashboard-page-provider";
import { formatGameDate, getPlayerLabel, getWinner } from "../utils";

export function CompletedGamesSection() {
  const { recentCompletedGames, user } = useDashboardPage();

  return (
    <Card className="mx-4">
      <CardHeader>
        <CardTitle>Completed games</CardTitle>
        <CardAction>
          <Link
            href="/game/history?status=completed"
            className={sectionActionClassName}
          >
            View all
            <ArrowRight />
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {recentCompletedGames.length === 0 ? (
          <CardEmpty className="flex flex-col items-center gap-3">
            <p>No completed games yet.</p>
            <Link
              href="/game/create/settings"
              className={sectionActionClassName}
            >
              Start your first game
              <ArrowRight />
            </Link>
          </CardEmpty>
        ) : (
          recentCompletedGames.map((game) => {
            const winner = getWinner(game, user.id);

            return (
              <Link
                key={`completed-game-${game.id}`}
                href={`/game/${game.id}/play`}
                className={cn(
                  sectionItemClassName,
                  "relative overflow-hidden transition-colors hover:bg-muted/80 border-none",
                )}
                style={{ backgroundColor: game.gameTitle?.color ?? undefined }}
              >
                {game.gameTitle?.imageUrl ? (
                  <>
                    <div
                      className="absolute inset-0 scale-105 bg-cover bg-center opacity-55 blur-[3px]"
                      style={{
                        backgroundImage: `url("${game.gameTitle.imageUrl}")`,
                      }}
                    />
                    <div className="absolute inset-0 bg-background/75" />
                  </>
                ) : null}
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <h3
                    className={cn(
                      "min-w-0 truncate",
                      sectionItemTitleClassName,
                      "font-bold",
                    )}
                  >
                    {game.gameTitle?.title ?? "New Game"}
                  </h3>
                  <div
                    className={cn(
                      "flex shrink-0 items-center gap-1",
                      sectionItemMetaClassName,
                    )}
                  >
                    <Trophy className="size-3.5" />
                    <span>{formatGameDate(game.completedAt)}</span>
                  </div>
                </div>
                <div className="relative z-10 mt-2 flex items-center gap-3">
                  <GamePlayerStack players={game.players} />
                  <div className="min-w-0 flex-1">
                    {winner ? (
                      <div className="flex items-center justify-end gap-2">
                        <p
                          className={cn(
                            "truncate font-semibold text-[color:var(--winner-text)]",
                            sectionItemMetaClassName,
                          )}
                        >
                          {winner.label} won
                        </p>
                        <ProfilePicture
                          user={winner.user}
                          size="sm"
                          className="winner-avatar-ring"
                        />
                        <WinnerIndicator
                          aria-hidden
                          className="hidden sm:inline-flex"
                          label="Winner"
                        />
                      </div>
                    ) : (
                      <p className={cn("truncate", sectionItemMetaClassName)}>
                        {game.players
                          .map((player) => getPlayerLabel(player, user.id))
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
