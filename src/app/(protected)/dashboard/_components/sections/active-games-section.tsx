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
  CardContent,
  CardEmpty,
} from "@/components/ui/card";
import { getProfileColorGlassStyles } from "@/components/profile/profile-color-styles";
import { cn } from "@/lib/utils";
import { ArrowRight, Gamepad2, Trophy } from "lucide-react";
import Link from "next/link";
import { useDashboardPage } from "../dashboard-page-provider";
import { GamePlayerStack } from "../controls/game-player-stack";
import {
  getPlayerPlacementDisplay,
  getPlayersOrderedByPlacement,
} from "../utils";
import { GameSectionHeader } from "./game-section-header";

export function ActiveGamesSection() {
  const { recentActiveGames, user } = useDashboardPage();
  const visibleGames = recentActiveGames.slice(0, 3);

  if (recentActiveGames.length === 0) {
    return <></>;
  }

  return (
    <Card className="mx-4 pt-2">
      <GameSectionHeader
        action={
          <Link
            href="/game/history?status=active"
            className={sectionActionClassName}
          >
            View all
            <ArrowRight />
          </Link>
        }
        icon={Gamepad2}
        title="Continue Playing"
        variant="active"
      />

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
              const actionStyle = game.gameTitle?.color
                ? getProfileColorGlassStyles(game.gameTitle.color)
                : undefined;

              return (
                <Link
                  key={`active-game-${game.id}`}
                  href={`/game/${game.id}/play`}
                  className="block"
                >
                  <GameTitleImage
                    className={cn(
                      sectionItemClassName,
                      "p-4 transition-colors hover:bg-muted/80",
                    )}
                    color={game.gameTitle?.color}
                    imageUrl={game.gameTitle?.imageUrl}
                    size="md"
                    verticalFocus={game.gameTitle?.imageVerticalFocus}
                    variant="card"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3
                        className={cn(
                          "min-w-0 truncate",
                          sectionItemTitleClassName,
                          "pr-2 text-[1.05rem] font-extrabold text-white",
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
                        ) : (
                          <div className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white shadow-none backdrop-blur-sm">
                            <span className="text-xs font-semibold text-white">
                              Not started
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 [clip-path:inset(-12px_0_-12px_-12px)]">
                        <GamePlayerStack players={orderedPlayers} size="sm" />
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        <div
                          className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium text-[color:var(--profile-surface-text)] shadow-none backdrop-blur-[6px] transition-all hover:brightness-95 dark:hover:brightness-110"
                          style={{
                            ...actionStyle,
                            backgroundColor: game.gameTitle?.color
                              ? `color-mix(in srgb, ${game.gameTitle.color} 34%, transparent)`
                              : undefined,
                            borderColor: game.gameTitle?.color
                              ? `color-mix(in srgb, ${game.gameTitle.color} 52%, white 18%)`
                              : undefined,
                          }}
                        >
                          <span>Play</span>
                          <ArrowRight className="size-3.5" />
                        </div>
                      </div>
                    </div>
                  </GameTitleImage>
                </Link>
              );
            })(),
          )
        )}
      </CardContent>
    </Card>
  );
}
