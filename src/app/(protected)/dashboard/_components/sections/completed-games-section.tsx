"use client";

import GameTitleImage from "@/components/game/game-title-image";
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
            const placement = getPlayerPlacementDisplay(game, user.id, "");
            const orderedPlayers = getPlayersOrderedByPlacement(game);

            return (
              <GameTitleImage
                key={`completed-game-${game.id}`}
                className={cn(
                  sectionItemClassName,
                  "border-border/70 p-0",
                )}
                color={game.gameTitle?.color}
                imageUrl={game.gameTitle?.imageUrl}
                variant="card"
              >
                <Link
                  href={`/game/${game.id}/play`}
                  className="block flex-1 p-4 transition-colors hover:bg-muted/80"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3
                      className={cn(
                        "min-w-0 truncate",
                        sectionItemTitleClassName,
                        "font-bold text-white",
                      )}
                    >
                      {game.gameTitle?.title ?? "New Game"}
                    </h3>
                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-1",
                        sectionItemMetaClassName,
                        "text-white/88",
                      )}
                    >
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
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 [clip-path:inset(-12px_0_-12px_-12px)]">
                      <GamePlayerStack
                        players={orderedPlayers}
                        size="sm"
                        winnerUserIds={game.winners.map(
                          (winner) => winner.userId,
                        )}
                      />
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      <RematchButton
                        className="h-8 rounded-full border border-white/25 bg-white/15 text-white shadow-none backdrop-blur-sm transition-colors hover:bg-white/22"
                        confirmButtonClassName="bg-primary text-primary-foreground hover:bg-primary/90"
                        gameId={game.id}
                        gameTitle={game.gameTitle?.title ?? "Untitled game"}
                        playerCount={game.players.length}
                        size="sm"
                        variant="ghost"
                      />
                    </div>
                  </div>
                </Link>
              </GameTitleImage>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
