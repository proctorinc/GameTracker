"use client";

import type { CSSProperties } from "react";
import { Trophy } from "lucide-react";
import type { UserBase } from "@/lib/db/store";
import ProfilePicture from "@/components/profile/profile-picture";
import { cn } from "@/lib/utils";

export type PlayerRankPodiumEntry = {
  id: string;
  position: number;
  displayName: string;
  value: string;
  user: Pick<UserBase, "id" | "firstName" | "lastName" | "color">;
  linkToProfile?: boolean;
  subdued?: boolean;
};

function getOrdinalLabel(position: number) {
  const mod100 = position % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${position}th`;
  }

  const mod10 = position % 10;
  if (mod10 === 1) {
    return `${position}st`;
  }

  if (mod10 === 2) {
    return `${position}nd`;
  }

  if (mod10 === 3) {
    return `${position}rd`;
  }

  return `${position}th`;
}

function getPodiumPlacementBadge(position: number, muted: boolean) {
  if (muted) {
    return {
      className: "placement-badge",
      style: {
        ["--placement-surface-soft" as string]: "oklch(0.96 0.002 255)",
        ["--placement-surface-strong" as string]: "oklch(0.86 0.004 255)",
        ["--placement-border" as string]: "oklch(0.76 0.004 255)",
        ["--placement-text" as string]: "oklch(0.34 0.006 255)",
        ["--placement-shadow" as string]:
          "0 18px 38px -24px rgba(71, 85, 105, 0.28)",
        ["--placement-surface-soft-dark" as string]: "oklch(0.31 0.004 255)",
        ["--placement-surface-strong-dark" as string]: "oklch(0.39 0.004 255)",
        ["--placement-border-dark" as string]: "oklch(0.46 0.005 255)",
        ["--placement-text-dark" as string]: "oklch(0.94 0.003 255)",
        ["--placement-shadow-dark" as string]:
          "0 18px 38px -24px rgba(2, 6, 23, 0.45)",
      } satisfies CSSProperties,
    };
  }

  if (position === 1) {
    return {
      className: "placement-badge",
      style: {} satisfies CSSProperties,
    };
  }

  if (position === 2) {
    return {
      className: "placement-badge",
      style: {
        ["--placement-surface-soft" as string]: "oklch(0.985 0.006 255)",
        ["--placement-surface-strong" as string]: "oklch(0.84 0.02 255)",
        ["--placement-border" as string]: "oklch(0.73 0.018 255)",
        ["--placement-text" as string]: "oklch(0.39 0.02 255)",
        ["--placement-shadow" as string]:
          "0 18px 38px -24px rgba(100, 116, 139, 0.45)",
        ["--placement-surface-soft-dark" as string]: "oklch(0.34 0.015 255)",
        ["--placement-surface-strong-dark" as string]: "oklch(0.49 0.02 255)",
        ["--placement-border-dark" as string]: "oklch(0.62 0.018 255)",
        ["--placement-text-dark" as string]: "oklch(0.96 0.006 255)",
        ["--placement-shadow-dark" as string]:
          "0 18px 38px -24px rgba(15, 23, 42, 0.65)",
      } satisfies CSSProperties,
    };
  }

  return {
    className: "placement-badge",
    style: {
      ["--placement-surface-soft" as string]: "oklch(0.985 0.018 60)",
      ["--placement-surface-strong" as string]: "oklch(0.8 0.065 55)",
      ["--placement-border" as string]: "oklch(0.69 0.075 53)",
      ["--placement-text" as string]: "oklch(0.41 0.06 48)",
      ["--placement-shadow" as string]:
        "0 18px 38px -24px rgba(180, 103, 47, 0.48)",
      ["--placement-surface-soft-dark" as string]: "oklch(0.34 0.03 55)",
      ["--placement-surface-strong-dark" as string]: "oklch(0.48 0.06 52)",
      ["--placement-border-dark" as string]: "oklch(0.63 0.07 52)",
      ["--placement-text-dark" as string]: "oklch(0.95 0.02 70)",
      ["--placement-shadow-dark" as string]:
        "0 18px 38px -24px rgba(67, 20, 7, 0.62)",
    } satisfies CSSProperties,
  };
}

function getPodiumAccent(position: number, muted: boolean) {
  if (muted) {
    return {
      cardClassName:
        "border-slate-400/55 bg-[linear-gradient(180deg,#eef2f7_0%,#dbe3ee_100%)] shadow-slate-950/10 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(100,116,139,0.2)_0%,rgba(255,255,255,0.03)_100%)]",
      heightClassName: "h-56",
    };
  }

  if (position === 1) {
    return {
      cardClassName:
        "border-amber-300/70 bg-[linear-gradient(180deg,#fff8eb_0%,#fff1cf_100%)] shadow-amber-950/10 dark:border-amber-200/20 dark:bg-[linear-gradient(180deg,rgba(245,158,11,0.18)_0%,rgba(255,255,255,0.03)_100%)]",
      heightClassName: "h-56",
    };
  }

  if (position === 2) {
    return {
      cardClassName:
        "border-slate-300/70 bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] shadow-slate-950/10 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(148,163,184,0.2)_0%,rgba(255,255,255,0.03)_100%)]",
      heightClassName: "h-48",
    };
  }

  return {
    cardClassName:
      "border-orange-300/70 bg-[linear-gradient(180deg,#fff7ed_0%,#ffedd5_100%)] shadow-orange-950/10 dark:border-orange-300/20 dark:bg-[linear-gradient(180deg,rgba(249,115,22,0.16)_0%,rgba(255,255,255,0.03)_100%)]",
    heightClassName: "h-44",
  };
}

function PodiumCard({
  entry,
  muted,
}: {
  entry: PlayerRankPodiumEntry;
  muted: boolean;
}) {
  const accent = getPodiumAccent(entry.position, muted);
  const placementBadge = getPodiumPlacementBadge(entry.position, muted);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center rounded-[1.4rem] border px-2 py-3 text-center shadow-lg",
        accent.cardClassName,
        accent.heightClassName,
        entry.subdued && "opacity-70 saturate-[0.85]",
      )}
      aria-label={`${getOrdinalLabel(entry.position)} place ${entry.displayName}`}
      data-podium-muted={muted || undefined}
    >
      <div
        className={cn(
          "placement-badge inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm",
          placementBadge.className,
        )}
        style={placementBadge.style}
      >
        <Trophy className="size-3.5" />
        <span>{getOrdinalLabel(entry.position)}</span>
      </div>
      <div className="mt-3">
        <ProfilePicture
          user={entry.user}
          className="border-none"
          linkToProfile={entry.linkToProfile}
          size={entry.position === 1 ? "md" : "sm"}
        />
      </div>
      <p
        className={cn(
          "mt-2 line-clamp-2 font-black text-foreground",
          entry.position === 1 ? "text-base" : "text-sm",
        )}
      >
        {entry.displayName}
      </p>
      <p
        className={cn(
          "mt-2 font-black leading-none text-foreground",
          entry.position === 1 ? "text-3xl" : "text-2xl",
        )}
      >
        {entry.value}
      </p>
    </div>
  );
}

export function PlayerRankPodium({
  ariaLabel,
  entries,
  className,
}: {
  ariaLabel: string;
  entries: PlayerRankPodiumEntry[];
  className?: string;
}) {
  const podiumDisplayEntries = [
    ...entries.filter((entry) => entry.position === 3),
    ...entries.filter((entry) => entry.position === 1),
    ...entries.filter((entry) => entry.position === 2),
    ...entries.filter((entry) => ![1, 2, 3].includes(entry.position)),
  ];
  const useMutedSingleEntryAccent = podiumDisplayEntries.length === 1;

  return (
    <section
      aria-label={ariaLabel}
      className={cn("px-1", className)}
      data-podium-single-entry-muted={useMutedSingleEntryAccent || undefined}
    >
      <div
        className={cn(
          "grid items-end gap-2",
          podiumDisplayEntries.length === 1 &&
            "mx-auto max-w-[12rem] grid-cols-1",
          podiumDisplayEntries.length === 2 && "grid-cols-2",
          podiumDisplayEntries.length >= 3 && "grid-cols-3",
        )}
      >
        {podiumDisplayEntries.map((entry) => (
          <PodiumCard
            key={entry.id}
            entry={entry}
            muted={useMutedSingleEntryAccent}
          />
        ))}
      </div>
    </section>
  );
}
