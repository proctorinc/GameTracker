import Link from "next/link";
import { ArrowRight, CalendarDays, Crown, Trophy, UserRound } from "lucide-react";
import GameTitleImage from "@/components/game/game-title-image";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { CardEmpty } from "@/components/ui/card";
import { WinnerIndicator } from "@/components/ui/winner-indicator";
import type { GameFull } from "@/lib/db/store";
import {
  deriveGamePlacementOutcome,
  formatPlacementLabel,
} from "@/lib/game-placement";
import { cn } from "@/lib/utils";

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

function getTopPlacementSummary(game: GameFull, currentUserId: string) {
  const placementOutcome = getPlacementOutcome(game);
  const topPlayers = game.players.filter((player) =>
    placementOutcome.winnerUserIds.includes(player.userId),
  );

  if (topPlayers.length === 0) {
    return {
      label: "Winner",
      text: "No winner yet",
      user: null,
      winnerUserIds: placementOutcome.winnerUserIds,
      wonByCurrentUser: false,
    };
  }

  const [primaryPlayer, ...otherTopPlayers] = topPlayers;
  const primaryName =
    primaryPlayer.userId === currentUserId
      ? "You"
      : (primaryPlayer.user.firstName ?? "Player");
  const placementLabel =
    formatPlacementLabel({
      placement: placementOutcome.placementByUserId[primaryPlayer.userId] ?? 1,
      won: true,
      hasExplicitPodium: placementOutcome.hasExplicitPodium,
    }) ?? "Winner";

  return {
    label: placementOutcome.hasExplicitPodium
      ? placementLabel
      : topPlayers.length > 1
        ? "Tied winner"
        : "Winner",
    text:
      otherTopPlayers.length === 0
        ? primaryName
        : `${primaryName} +${otherTopPlayers.length} more`,
    user: primaryPlayer.user,
    winnerUserIds: placementOutcome.winnerUserIds,
    wonByCurrentUser: placementOutcome.wonByUserId[currentUserId] ?? false,
  };
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
        const topPlacementSummary = getTopPlacementSummary(game, currentUserId);
        const didWin = topPlacementSummary.wonByCurrentUser;
        const title = game.gameTitle;
        const titleHref = title ? `/titles/${title.id}` : null;

        return (
          <article
            key={game.id}
            className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-lg"
          >
            <GameTitleImage
              className="min-h-52 border-b border-border/40"
              color={title?.color}
              contentClassName="h-full"
              imageUrl={title?.imageUrl}
              variant="card"
            >
              <div className="flex h-full flex-col justify-between gap-4 p-4 text-white">
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
                    {titleHref ? (
                      <Link
                        href={titleHref}
                        className="block text-2xl font-black tracking-tight transition-opacity hover:opacity-90"
                      >
                        {title?.title ?? "New Game"}
                      </Link>
                    ) : (
                      <h2 className="text-2xl font-black tracking-tight">
                        {title?.title ?? "New Game"}
                      </h2>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/88">
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

                  <div className="rounded-[1.4rem] border border-white/15 bg-black/18 px-3 py-2.5 backdrop-blur-sm">
                    <div className="flex items-center justify-start">
                      <PlayerStack
                        currentUserId={currentUserId}
                        players={game.players}
                        winnerUserIds={topPlacementSummary.winnerUserIds}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </GameTitleImage>

            <div className="space-y-2.5 bg-card px-4 pt-3 pb-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Trophy className="size-3.5" />
                  {topPlacementSummary.user ? (
                    <>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                        {topPlacementSummary.label}
                      </span>
                      <ProfilePicture
                        user={topPlacementSummary.user}
                        size="xs"
                        className="shadow-sm"
                      />
                      <span
                        className={cn(
                          "font-semibold text-foreground",
                          didWin && "text-[color:var(--winner-text)]",
                        )}
                      >
                        {topPlacementSummary.text}
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold text-foreground">
                      No winner yet
                    </span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                    Creator
                  </span>
                  <span className="font-semibold text-foreground">
                    {game.creatorId === currentUserId
                      ? "You"
                      : (game.creator.firstName ?? "Player")}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <UserRound className="size-3.5" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                    Rounds
                  </span>
                  <span className="font-semibold text-foreground">
                    {game.completedRounds}
                  </span>
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {titleHref ? (
                    <Link
                      href={titleHref}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-muted"
                    >
                      Title history
                    </Link>
                  ) : null}
                  <Link
                    href={`/game/${game.id}/play`}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Open game
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </>
  );
}
