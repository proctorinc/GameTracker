"use client";

import type { PlayerRankGameDelta } from "@/lib/db/store/player-rank.store";
import { cn } from "@/lib/utils";

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
  const toneClassName =
    tone === "neutral"
      ? "border-border/80 bg-muted/70 text-foreground"
      : delta.deltaMinor > 0
        ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
        : delta.deltaMinor < 0
          ? "border-rose-500/30 bg-rose-500/12 text-rose-700 dark:text-rose-300"
          : "border-border/80 bg-muted/70 text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em]",
        toneClassName,
        className,
      )}
    >
      {delta.deltaMinor === 0 ? `No ${label} change` : `${delta.deltaFormatted} ${label}`}
    </span>
  );
}
