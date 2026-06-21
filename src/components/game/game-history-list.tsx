import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, Crown, Trophy, UserRound } from "lucide-react";
import GameTitleImage from "@/components/game/game-title-image";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { CardEmpty } from "@/components/ui/card";
import { WinnerIndicator } from "@/components/ui/winner-indicator";
import type { GameFull } from "@/lib/db/store";
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

function getWinnerSummary(game: GameFull, currentUserId: string) {
  if (game.winners.length === 0) {
    return "No winner yet";
  }

  const [primaryWinner, ...otherWinners] = game.winners;
  const primaryName =
    primaryWinner.userId === currentUserId
      ? "You"
      : (primaryWinner.user.firstName ?? "Player");

  if (otherWinners.length === 0) {
    return primaryWinner.userId === currentUserId ? "You won" : `${primaryName} won`;
  }

  return `${primaryName} +${otherWinners.length} more`;
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
              className="ring-2 ring-background shadow-sm"
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

function DetailItem({
  label,
  value,
  icon,
  emphasis = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className={cn(
          "mt-2 text-sm font-semibold text-foreground",
          emphasis && "text-[color:var(--winner-text)]",
        )}
      >
        {value}
      </p>
    </div>
  );
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
        const didWin = game.winners.some((winner) => winner.userId === currentUserId);
        const title = game.gameTitle;
        const titleHref = title ? `/titles/${title.id}` : null;
        const winnerSummary = getWinnerSummary(game, currentUserId);
        const playerLabels = game.players.map((player) =>
          getPlayerLabel(player, currentUserId),
        );

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

                  <div className="rounded-[1.4rem] border border-white/15 bg-black/18 p-3 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <PlayerStack
                        currentUserId={currentUserId}
                        players={game.players}
                        winnerUserIds={game.winners.map((winner) => winner.userId)}
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
                          Players
                        </p>
                        <p className="line-clamp-2 text-sm font-semibold text-white">
                          {playerLabels.join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </GameTitleImage>

            <div className="space-y-4 bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  emphasis={didWin}
                  icon={<Trophy className="size-3.5" />}
                  label="Winner"
                  value={winnerSummary}
                />
                <DetailItem
                  icon={<CalendarDays className="size-3.5" />}
                  label="Creator"
                  value={
                    game.creatorId === currentUserId
                      ? "You"
                      : (game.creator.firstName ?? "Player")
                  }
                />
                <DetailItem
                  icon={<UserRound className="size-3.5" />}
                  label="Rounds"
                  value={`${game.completedRounds} completed`}
                />
                <DetailItem
                  icon={<ArrowRight className="size-3.5" />}
                  label="Status"
                  value={game.completedAt ? "Finished" : "Still live"}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {game.winners[0] ? (
                    <>
                      <ProfilePicture
                        user={game.winners[0].user}
                        size="sm"
                        className="winner-avatar-ring shadow-sm"
                      />
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Top finisher
                        </p>
                        <p className="text-sm font-semibold">
                          {winnerSummary}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Game owner
                      </p>
                      <p className="text-sm font-semibold">
                        {game.creatorId === currentUserId
                          ? "You"
                          : (game.creator.firstName ?? "Player")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {titleHref ? (
                    <Link
                      href={titleHref}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                    >
                      Title history
                    </Link>
                  ) : null}
                  <Link
                    href={`/game/${game.id}/play`}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Open game
                    <ArrowRight className="size-4" />
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
