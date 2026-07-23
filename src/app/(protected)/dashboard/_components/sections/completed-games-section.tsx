"use client";

import GameTitleImage from "@/components/game/game-title-image";
import RankChip from "@/components/player-rank/RankChip";
import { getProfileColorGlassStyles } from "@/components/profile/profile-color-styles";
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
import { RematchButton } from "@/components/game/rematch-button";
import { cn } from "@/lib/utils";
import { ArrowRight, History, Trophy } from "lucide-react";
import Link from "next/link";
import { GamePlayerStack } from "../controls/game-player-stack";
import { useDashboardPage } from "../dashboard-page-provider";
import {
  getPlayerPlacementDisplay,
  getWinnerUserIds,
  getPlayersOrderedByPlacement,
} from "../utils";
import { GameSectionHeader } from "./game-section-header";

export function CompletedGamesSection() {
  const { recentCompletedGames, user } = useDashboardPage();

  return (
    <Card className="mx-4 overflow-visible pt-2">
      <GameSectionHeader
        action={
          <Link
            href="/game/history?status=completed"
            className={sectionActionClassName}
          >
            View all
            <ArrowRight />
          </Link>
        }
        icon={History}
        title="Recent games"
        variant="recent"
      />

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
            const winnerUserIds = getWinnerUserIds(game);
            const actionStyle = game.gameTitle?.color
              ? getProfileColorGlassStyles(game.gameTitle.color)
              : undefined;

            return (
              <GameTitleImage
                key={`completed-game-${game.id}`}
                className={cn(
                  sectionItemClassName,
                  "border-2 p-0",
                )}
                color={game.gameTitle?.color}
                imageUrl={game.gameTitle?.imageUrl}
                size="md"
                verticalFocus={game.gameTitle?.imageVerticalFocus}
                variant="card"
              >
                <Link
                  href={`/game/${game.id}/play`}
                  className="block flex-1 p-4 transition-colors hover:bg-muted/80"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3
                        className={cn(
                          "min-w-0 truncate",
                          sectionItemTitleClassName,
                          "text-[1.05rem] font-extrabold text-white",
                        )}
                      >
                        {game.gameTitle?.title ?? "New Game"}
                      </h3>
                      {game.currentUserRankDelta &&
                      game.currentUserRankDelta.deltaMinor !== 0 ? (
                        <RankChip
                          className="shrink-0"
                          delta={game.currentUserRankDelta.deltaFormatted}
                          size="sm"
                        />
                      ) : null}
                    </div>
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
                        winnerUserIds={winnerUserIds}
                      />
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      <RematchButton
                        className="h-8 rounded-full border px-3 text-sm font-medium text-[color:var(--profile-surface-text)] shadow-none backdrop-blur-[6px] transition-all hover:brightness-95 dark:hover:brightness-110"
                        confirmButtonClassName="bg-primary text-primary-foreground hover:bg-primary/90"
                        gameId={game.id}
                        gameTitle={game.gameTitle?.title ?? "Untitled game"}
                        playerCount={game.players.length}
                        size="sm"
                        style={{
                          ...actionStyle,
                          backgroundColor: game.gameTitle?.color
                            ? `color-mix(in srgb, ${game.gameTitle.color} 34%, transparent)`
                            : undefined,
                          borderColor: game.gameTitle?.color
                            ? `color-mix(in srgb, ${game.gameTitle.color} 52%, white 18%)`
                            : undefined,
                        }}
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
