import Link from "next/link";
import { CalendarDays, Trophy } from "lucide-react";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
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
}: {
  games: GameFull[];
  currentUserId: string;
  emptyMessage: string;
}) {
  if (games.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border p-6 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {games.map((game) => {
        const didWin = game.winners.some((winner) => winner.userId === currentUserId);
        const winner = game.winners[0] ?? null;

        return (
          <Link
            key={game.id}
            href={`/game/${game.id}/play`}
            className="rounded-[1.5rem] border border-border/80 bg-muted/40 p-4 transition-colors hover:bg-muted"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={game.completedAt ? "default" : "secondary"}>
                    {game.completedAt ? "Completed" : "In progress"}
                  </Badge>
                  {didWin ? (
                    <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500">
                      <Trophy className="mr-1 size-3.5" />
                      Won
                    </Badge>
                  ) : null}
                  {game.creatorId === currentUserId ? (
                    <Badge variant="outline">Created by you</Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-black">
                    {game.gameTitle?.title ?? "New Game"}
                  </h2>
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

              <div className="flex shrink-0 items-center gap-3 md:min-w-52 md:justify-end">
                {winner ? (
                  <>
                    <ProfilePicture
                      user={winner.user}
                      size="sm"
                      className="ring-2 ring-amber-300 shadow-sm dark:ring-amber-500/50"
                    />
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Winner
                      </p>
                      <p className="font-bold">
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
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
}
