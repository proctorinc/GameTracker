import Link from "next/link";
import type { CSSProperties } from "react";
import { CalendarDays, Crown, Trophy, UserRound } from "lucide-react";
import GameTitleImage from "@/components/game/game-title-image";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { CardEmpty } from "@/components/ui/card";
import { WinnerIndicator } from "@/components/ui/winner-indicator";
import type { GameFull } from "@/lib/db/store";
import { deriveGamePlacementOutcome } from "@/lib/game-placement";
import { cn } from "@/lib/utils";
import styles from "./game-history-list.module.css";

function formatDate(value: string | null | undefined, prefix: string) {
  if (!value) {
    return prefix;
  }

  return `${prefix} ${new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function getPlayerLabel(
  player: GameFull["players"][number],
  currentUserId: string,
) {
  return player.userId === currentUserId
    ? "You"
    : (player.user.firstName ?? "Player");
}

function PlayerStack({
  players,
  currentUserId,
  winnerUserIds,
}: {
  players: GameFull["players"];
  currentUserId: string;
  winnerUserIds: string[];
}) {
  const isCrowded = players.length > 5;

  return (
    <div className="flex min-w-0 items-center">
      {players.map((player, index) => {
        const isWinner = winnerUserIds.includes(player.userId);

        return (
          <div
            key={`${player.gameId}-${player.id}`}
            className={cn(
              "relative shrink-0",
              index > 0 && (isCrowded ? "-ml-5" : "-ml-2"),
            )}
          >
            <ProfilePicture
              user={player.user}
              size="sm"
              className="shadow-sm"
              content={
                <span className="text-[10px] font-black leading-none">
                  {getPlayerLabel(player, currentUserId)
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              }
            />
            {isWinner ? (
              <div className="winner-icon absolute -top-1 -left-0.5 flex size-4 items-center justify-center rounded-full">
                <Crown className="size-2.5" />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function getPlacementOutcome(game: GameFull) {
  return deriveGamePlacementOutcome({
    scoringMode: game.scoringMode,
    participants: game.players.map((player) => ({
      userId: player.userId,
      score: player.score,
    })),
    resultPlacements: game.resultPlacements,
    winnerUserIds: game.winners.map((winner) => winner.userId),
    suppressAllTiedPlacement: game.completedRounds === 0,
  });
}

export default function GameHistoryList({
  games,
  currentUserId,
  emptyMessage,
  emptyActionHref,
  emptyActionLabel,
}: {
  games: GameFull[];
  currentUserId: string;
  emptyMessage: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
}) {
  if (games.length === 0) {
    return (
      <CardEmpty className="flex flex-col items-center gap-3 p-6">
        <p>{emptyMessage}</p>
        {emptyActionHref && emptyActionLabel ? (
          <Link
            href={emptyActionHref}
            className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            {emptyActionLabel}
          </Link>
        ) : null}
      </CardEmpty>
    );
  }

  return (
    <>
      {games.map((game) => {
        const placementOutcome = getPlacementOutcome(game);
        const didWin = placementOutcome.wonByUserId[currentUserId] ?? false;
        const title = game.gameTitle;
        const titleColor = title?.color?.trim() || "#64748b";

        return (
          <article
            key={game.id}
            className={styles.card}
            style={{ "--game-title-color": titleColor } as CSSProperties}
          >
            <Link
              href={`/game/${game.id}/play`}
              className={styles.cardLink}
              aria-label={`Open ${title?.title ?? "game"}`}
            >
              <GameTitleImage
                className="h-full rounded-[inherit] border-0"
                color={title?.color}
                contentClassName="h-full"
                imageUrl={title?.imageUrl}
                verticalFocus={title?.imageVerticalFocus}
                variant="card"
              >
                <div className={styles.dotTexture} aria-hidden="true" />
                <div className={styles.sheen} aria-hidden="true" />
                <div className={styles.glint} aria-hidden="true" />
                <div className={styles.frame} aria-hidden="true" />

                <div className="relative z-10 flex h-full flex-col justify-between gap-4 p-4 text-white sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className="border-white/20 bg-white/16 text-white backdrop-blur-sm"
                      variant="outline"
                    >
                      {game.completedAt ? "Completed" : "In progress"}
                    </Badge>
                    {didWin ? (
                      <WinnerIndicator
                        className="border-white/20 bg-white/16 text-white backdrop-blur-sm"
                        label="Won"
                      />
                    ) : null}
                    {game.creatorId === currentUserId ? (
                      <Badge
                        className="border-white/20 bg-white/16 text-white backdrop-blur-sm"
                        variant="outline"
                      >
                        Created by you
                      </Badge>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black tracking-tight text-balance drop-shadow-md sm:text-3xl">
                        {title?.title ?? "New Game"}
                      </h2>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/88 drop-shadow-sm">
                        <span className="inline-flex items-center gap-1.5">
                          {game.completedAt ? (
                            <Trophy className="size-4" />
                          ) : (
                            <CalendarDays className="size-4" />
                          )}
                          {formatDate(
                            game.completedAt ?? game.createdAt,
                            game.completedAt ? "Completed" : "Started",
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="size-4" />
                          {game.players.length} players
                        </span>
                      </div>
                    </div>

                    <PlayerStack
                      currentUserId={currentUserId}
                      players={game.players}
                      winnerUserIds={placementOutcome.winnerUserIds}
                    />
                  </div>
                </div>
              </GameTitleImage>
            </Link>
          </article>
        );
      })}
    </>
  );
}
