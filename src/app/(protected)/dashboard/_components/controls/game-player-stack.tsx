"use client";

import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import ProfilePicture from "@/components/profile/profile-picture";
import { Crown } from "lucide-react";
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
  winnerUserIds,
  size = "xs",
}: {
  players: DashboardPageData["recentActiveGames"][number]["players"];
  currentUserId?: string;
  winnerUserIds?: string[];
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const isCrowded = players.length > 5;

  return (
    <div className="flex min-w-0 items-center">
      {players.map((player, index) => {
        const isWinner = winnerUserIds?.includes(player.userId) ?? false;

        return (
          <div
            key={`${player.gameId}-player-${player.id}`}
            className={cn(
              "relative shrink-0",
              index > 0 && (isCrowded ? "-ml-5" : "-ml-2"),
            )}
          >
            <ProfilePicture
              user={player.user}
              size={size}
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
            {isWinner ? (
              <div className="pointer-events-none absolute -top-1 -left-0.5 z-0 -rotate-[5deg]">
                <div className="winner-icon flex size-4 items-center justify-center rounded-full">
                  <Crown className="size-2.5" />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
