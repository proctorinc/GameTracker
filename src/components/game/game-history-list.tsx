import Link from "next/link";
import { ArrowRight, CalendarDays, Trophy } from "lucide-react";
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

function PlayerStack({
  players,
  currentUserId,
}: {
  players: GameFull["players"];
  currentUserId: string;
}) {
  return (
    <div className="flex items-center">
      {players.map((player, index) => (
        <div
          key={`${player.gameId}-${player.id}`}
          className={cn("relative", index > 0 && "-ml-2")}
        >
          <ProfilePicture
            user={player.user}
            size="xs"
            className="ring-2 ring-background shadow-sm"
            content={
              <span className="text-[10px] font-black leading-none">
                {getPlayerLabel(player, currentUserId)
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            }
          />
        </div>
      ))}
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
        const winner = game.winners[0] ?? null;
        const title = game.gameTitle;
        const titleHref = title ? `/titles/${title.id}` : null;

        return (
          <article
            key={game.id}
            className="rounded-[1.5rem] border border-border/80 bg-muted/40 p-4 transition-colors hover:bg-muted"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 flex-1 gap-4">
                {titleHref ? (
                  <Link
                    href={titleHref}
                    className="block shrink-0 transition-transform hover:scale-[1.02]"
                    aria-label={`View ${title?.title ?? "game"} history`}
                    title={`View ${title?.title ?? "game"} history`}
                  >
                    <GameTitleImage
                      className="h-24 w-20 rounded-2xl border border-border/70 bg-card shadow-sm"
                      color={title?.color}
                      imageUrl={title?.imageUrl}
                      variant="thumbnail"
                    >
                      <div className="absolute inset-x-0 bottom-0 p-2">
                        <span className="line-clamp-2 text-[11px] font-black leading-tight text-white">
                          {title?.title ?? "New Game"}
                        </span>
                      </div>
                    </GameTitleImage>
                  </Link>
                ) : null}

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={game.completedAt ? "default" : "secondary"}>
                      {game.completedAt ? "Completed" : "In progress"}
                    </Badge>
                    {didWin ? (
                      <WinnerIndicator label="Won" />
                    ) : null}
                    {game.creatorId === currentUserId ? (
                      <Badge variant="outline">Created by you</Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      {titleHref ? (
                        <Link
                          href={titleHref}
                          className="text-xl font-black transition-colors hover:text-primary"
                        >
                          {title?.title ?? "New Game"}
                        </Link>
                      ) : (
                        <h2 className="text-xl font-black">
                          {title?.title ?? "New Game"}
                        </h2>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {game.completedAt ? (
                        <Trophy className="size-4" />
                      ) : (
                        <CalendarDays className="size-4" />
                      )}
                      <span>
                        {formatDate(
                          game.completedAt ?? game.createdAt,
                          game.completedAt ? "Completed" : "Started",
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <PlayerStack players={game.players} currentUserId={currentUserId} />
                    <span>
                      {game.players
                        .map((player) => getPlayerLabel(player, currentUserId))
                        .join(", ")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3 md:min-w-52 md:justify-end">
                {winner ? (
                  <>
                    <ProfilePicture
                      user={winner.user}
                      size="sm"
                      className="winner-avatar-ring shadow-sm"
                    />
                    <div className="text-right">
                      <p className="winner-muted text-xs uppercase tracking-[0.18em]">
                        Winner
                      </p>
                      <p className="font-bold text-[color:var(--winner-text)]">
                        {winner.userId === currentUserId
                          ? "You won"
                          : `${winner.user.firstName ?? "Player"} won`}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Creator
                    </p>
                    <p className="font-bold">
                      {game.creatorId === currentUserId
                        ? "You"
                        : (game.creator.firstName ?? "Player")}
                    </p>
                  </div>
                )}
                <Link
                  href={`/game/${game.id}/play`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                >
                  Open game
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </>
  );
}
