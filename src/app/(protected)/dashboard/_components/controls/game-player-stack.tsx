"use client";

import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import ProfilePicture from "@/components/profile/profile-picture";
import { cn } from "@/lib/utils";

function getPlayerLabel(
  player: DashboardPageData["recentActiveGames"][number]["players"][number],
  currentUserId?: string,
) {
  return player.userId === currentUserId
    ? "You"
    : (player.user.firstName ?? "Player");
}

export function GamePlayerStack({
  players,
  currentUserId,
}: {
  players: DashboardPageData["recentActiveGames"][number]["players"];
  currentUserId?: string;
}) {
  return (
    <div className="flex items-center">
      {players.map((player, index) => {
        return (
          <div
            key={`${player.gameId}-player-${player.id}`}
            className={cn("relative", index > 0 && "-ml-2")}
          >
            <ProfilePicture
              user={player.user}
              size="xs"
              className="ring-2 ring-background shadow-sm"
              content={
                currentUserId ? (
                  <span className="text-[10px] font-black leading-none">
                    {getPlayerLabel(player, currentUserId)
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                ) : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}
