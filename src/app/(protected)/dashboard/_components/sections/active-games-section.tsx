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
import { getProfileColorSurfaceStyles } from "@/components/profile/profile-color-styles";
import { cn } from "@/lib/utils";
import { ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";
import { useDashboardPage } from "../dashboard-page-provider";
import { GamePlayerStack } from "../controls/game-player-stack";
import { getPlayerPlacementDisplay, getPlayersOrderedByPlacement } from "../utils";

function TwoPlayerScore({
  game,
}: {
  game: ReturnType<typeof useDashboardPage>["recentActiveGames"][number];
}) {
  const orderedPlayers = getPlayersOrderedByPlacement(game);
  const [firstPlayer, secondPlayer] = orderedPlayers;

  if (!firstPlayer || !secondPlayer) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="relative isolate flex h-8 w-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full text-[11px] font-black leading-none tabular-nums ring-1 ring-black/6 shadow-sm dark:ring-white/12"
        style={getProfileColorSurfaceStyles(firstPlayer.user.color)}
      >
        <div className="pointer-events-none absolute inset-[1px] rounded-full border border-[var(--profile-surface-ring)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,var(--profile-surface-highlight)_0%,transparent_58%)] dark:bg-[radial-gradient(circle_at_30%_28%,rgba(15,23,42,0.18)_0%,transparent_58%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_100%)]" />
        <span className="relative">{firstPlayer.score}</span>
      </div>
      <span className={cn("text-xs leading-none", sectionItemMetaClassName)}>
        -
      </span>
      <div
        className="relative isolate flex h-8 w-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full text-[11px] font-black leading-none tabular-nums ring-1 ring-black/6 shadow-sm dark:ring-white/12"
        style={getProfileColorSurfaceStyles(secondPlayer.user.color)}
      >
        <div className="pointer-events-none absolute inset-[1px] rounded-full border border-[var(--profile-surface-ring)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,var(--profile-surface-highlight)_0%,transparent_58%)] dark:bg-[radial-gradient(circle_at_30%_28%,rgba(15,23,42,0.18)_0%,transparent_58%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_100%)]" />
        <span className="relative">{secondPlayer.score}</span>
      </div>
    </div>
  );
}

export function ActiveGamesSection() {
  const { recentActiveGames, user } = useDashboardPage();
  const hasMoreThanThreeGames = recentActiveGames.length > 3;
  const visibleGames = recentActiveGames.slice(0, 3);

  if (recentActiveGames.length === 0) {
    return <></>;
  }

  return (
    <Card className="mx-4">
      <CardHeader>
        <CardTitle>Continue Playing</CardTitle>
        {hasMoreThanThreeGames ? (
          <CardAction>
            <Link
              href="/game/history?status=active"
              className={sectionActionClassName}
            >
              View all
              <ArrowRight />
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {recentActiveGames.length === 0 ? (
          <CardEmpty className="flex flex-col items-center gap-3">
            <p>No active games yet.</p>
            <Link
              href="/game/create/settings"
              className={sectionActionClassName}
            >
              Start a game
              <ArrowRight />
            </Link>
          </CardEmpty>
        ) : (
          visibleGames.map((game) =>
            (() => {
              const placement = getPlayerPlacementDisplay(game, user.id);
              const orderedPlayers = getPlayersOrderedByPlacement(game);

              return (
                <Link
                  key={`active-game-${game.id}`}
                  href={`/game/${game.id}/play`}
                  className={cn(
                    sectionItemClassName,
                    "relative overflow-hidden border-none p-3 transition-colors hover:bg-muted/80",
                  )}
                  style={{
                    backgroundColor: game.gameTitle?.color ?? undefined,
                  }}
                >
                  {game.gameTitle?.imageUrl ? (
                    <>
                      <div
                        className="absolute inset-0 scale-105 bg-cover bg-center opacity-55 blur-[1px]"
                        style={{
                          backgroundImage: `url("${game.gameTitle.imageUrl}")`,
                        }}
                      />
                      <div className="absolute inset-0 bg-background/75" />
                    </>
                  ) : null}
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <h3
                      className={cn(
                        "min-w-0 truncate font-bold",
                        sectionItemTitleClassName,
                        "pr-2 font-bold",
                      )}
                    >
                      {game.gameTitle?.title ?? "New Game"}
                    </h3>
                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 font-medium",
                        sectionItemMetaClassName,
                      )}
                    >
                      <span>Play</span>
                      <ArrowRight className="size-3.5" />
                    </div>
                  </div>
                  <div className="relative z-10 mt-2 flex items-center justify-between gap-3">
                    {game.players.length === 2 ? (
                      <TwoPlayerScore game={game} />
                    ) : (
                      <GamePlayerStack players={orderedPlayers} />
                    )}
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
                            Not started
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })(),
          )
        )}
      </CardContent>
    </Card>
  );
}
