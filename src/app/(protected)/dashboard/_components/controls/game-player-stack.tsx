"use client";

import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import ProfilePicture from "@/components/profile/profile-picture";
import { cn } from "@/lib/utils";

export function GamePlayerStack({
  players,
}: {
  players: DashboardPageData["recentActiveGames"][number]["players"];
}) {
  return (
    <div className="flex items-center">
      {players.map((player, index) => {
        return (
          <div
            key={`${player.gameId}-player-${player.id}`}
            className={cn("relative", index > 0 && "-ml-2")}
          >
            <ProfilePicture user={player.user} size="xs" />
          </div>
        );
      })}
    </div>
  );
}
