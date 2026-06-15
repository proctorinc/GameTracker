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
import { RematchButton } from "@/components/game/rematch-button";
import { cn } from "@/lib/utils";
import { ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";
import { GamePlayerStack } from "../controls/game-player-stack";
import { useDashboardPage } from "../dashboard-page-provider";
import {
  formatGameDate,
  getPlayerPlacementDisplay,
  getPlayersOrderedByPlacement,
} from "../utils";

export function CompletedGamesSection() {
  const { recentCompletedGames, user } = useDashboardPage();

  return (
    <Card className="mx-4">
      <CardHeader>
        <CardTitle>Recent games</CardTitle>
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
            const placement = getPlayerPlacementDisplay(
              game,
              user.id,
              "Finished",
            );
            const orderedPlayers = getPlayersOrderedByPlacement(game);

            return (
              <div
                key={`completed-game-${game.id}`}
                className={cn(
                  sectionItemClassName,
                  "relative overflow-hidden border-none p-0",
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
                <Link
                  href={`/game/${game.id}/play`}
                  className="relative z-10 block p-4 transition-colors hover:bg-muted/80"
                >
                  <div className="flex items-center justify-between gap-3">
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
                      <span>{formatGameDate(game.completedAt)}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <GamePlayerStack
                      players={orderedPlayers}
                      winnerUserIds={game.winners.map((winner) => winner.userId)}
                    />
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      {placement ? (
                        <div
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm",
                            placement.className,
                          )}
                          style={placement.style}
                        >
                          {placement.showTrophy ? (
                            <Trophy
                              className={cn(
                                "size-3.5",
                                placement.trophyClassName,
                              )}
                            />
                          ) : null}
                          <span>{placement.label}</span>
                        </div>
                      ) : (
                        <div className="rounded-full bg-background/80 px-2.5 py-1 backdrop-blur-sm">
                          <span className="text-xs font-semibold text-foreground">
                            Finished
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="relative z-10 px-4 pb-4">
                  <RematchButton
                    className="h-9 w-full rounded-xl border border-white/20 bg-foreground/8 px-3 text-sm text-foreground shadow-none backdrop-blur-sm hover:bg-foreground/14 dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/14"
                    confirmButtonClassName="bg-primary text-primary-foreground hover:bg-primary/90"
                    gameId={game.id}
                    gameTitle={game.gameTitle?.title ?? "Untitled game"}
                    playerCount={game.players.length}
                    size="sm"
                    variant="ghost"
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
