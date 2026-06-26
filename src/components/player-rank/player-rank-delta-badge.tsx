"use client";

import type { PlayerRankGameDelta } from "@/lib/db/store/player-rank.store";
import RankChip from "./RankChip";

type PlayerRankDeltaBadgeProps = {
  delta: PlayerRankGameDelta;
  className?: string;
  label?: string;
  tone?: "default" | "neutral";
};

export function PlayerRankDeltaBadge({
  delta,
  className,
  label = "Rank",
  tone = "default",
}: PlayerRankDeltaBadgeProps) {
  const rankChipTone =
    tone === "neutral"
      ? "neutral"
      : delta.deltaMinor > 0
        ? "positive"
        : delta.deltaMinor < 0
          ? "negative"
          : "neutral";
  const content =
    delta.deltaMinor === 0 ? `No ${label} change` : delta.deltaFormatted;

  return (
    <RankChip
      className={className}
      delta={content}
      size="md"
      tone={rankChipTone}
    />
  );
}
