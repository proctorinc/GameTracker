"use client";

import PlayGame from "@/components/game/PlayGame";
import type { PlayGameV2ScreenProps } from "../types";

export function RoundWinnerPlayGameV2Screen({
  config,
  props,
}: PlayGameV2ScreenProps) {
  return (
    <PlayGame
      {...props}
      compatibilityConfig={{
        allowAnyVersion: true,
        liveMode: "round_winner",
        requiresScoredTieBreak: config.requiresPlacementTieBreak,
      }}
    />
  );
}
