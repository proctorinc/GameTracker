import type { CSSProperties } from "react";
import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import {
  deriveGamePlacementOutcome,
  formatPlacementLabel,
} from "@/lib/game-placement";

type DashboardGamePlayers = DashboardPageData["recentActiveGames"][number]["players"];
type DashboardGameLike = {
  players: DashboardGamePlayers;
  scoringMode: DashboardPageData["recentActiveGames"][number]["scoringMode"];
  completedRounds?: DashboardPageData["recentActiveGames"][number]["completedRounds"];
  winners?: Array<{ userId: string }> | null;
  resultPlacements?: Array<{ userId: string; placement: number }> | null;
};

export function formatGameDate(value: string | null | undefined) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

export function getPlayerLabel(
  player: DashboardPageData["recentActiveGames"][number]["players"][number],
  currentUserId: string,
) {
  return player.user.id === currentUserId
    ? "Me"
    : (player.user.firstName ?? "Player");
}

export function getOrdinalLabel(value: number) {
  const mod100 = value % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

export function getPlayerPlacement(
  game: DashboardGameLike,
  currentUserId: string,
) {
  return getPlacementOutcome(game).placementByUserId[currentUserId] ?? null;
}

export function getPlayersOrderedByPlacement<T extends DashboardGamePlayers[number]>(
  game: DashboardGameLike & { players: T[] },
) {
  const placementOutcome = getPlacementOutcome(game);
  const placedPlayers = game.players.filter(
    (player) => placementOutcome.placementByUserId[player.userId] !== undefined,
  );

  if (placedPlayers.length === 0) {
    return game.players;
  }

  return [...game.players].sort((left, right) => {
    const leftPlacement = placementOutcome.placementByUserId[left.userId];
    const rightPlacement = placementOutcome.placementByUserId[right.userId];

    if (leftPlacement === undefined && rightPlacement === undefined) {
      return 0;
    }

    if (leftPlacement === undefined) {
      return 1;
    }

    if (rightPlacement === undefined) {
      return -1;
    }

    if (leftPlacement !== rightPlacement) {
      return leftPlacement - rightPlacement;
    }

    return 0;
  });
}

export function getWinnerUserIds(game: DashboardGameLike) {
  return getPlacementOutcome(game).winnerUserIds;
}

export function getPlayerPlacementDisplay(
  game: DashboardGameLike,
  currentUserId: string,
  prefix = "Currently",
) {
  const place = getPlayerPlacement(game, currentUserId);

  if (!place) {
    return null;
  }

  const placementOutcome = getPlacementOutcome(game);
  const label =
    game.scoringMode === "no_score" && prefix.length === 0
      ? formatPlacementLabel({
          placement: place,
          won: placementOutcome.wonByUserId[currentUserId] ?? false,
          hasExplicitPodium: placementOutcome.hasExplicitPodium,
        })
      : [prefix, getOrdinalLabel(place)].filter(Boolean).join(" ");

  if (place === 1) {
    return {
      place,
      label: label ?? getOrdinalLabel(place),
      className: "placement-badge",
      style: {} satisfies CSSProperties,
      trophyClassName: "",
      showTrophy: true,
    };
  }

  if (place === 2) {
    return {
      place,
      label: label ?? getOrdinalLabel(place),
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
      trophyClassName: "",
      showTrophy: true,
    };
  }

  if (place === 3) {
    return {
      place,
      label: label ?? getOrdinalLabel(place),
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
      trophyClassName: "",
      showTrophy: true,
    };
  }

  return {
    place,
    label: label ?? getOrdinalLabel(place),
    className:
      "bg-background/60 text-foreground ring-1 ring-black/8 dark:ring-white/10",
    style: {} satisfies CSSProperties,
    trophyClassName: "",
    showTrophy: false,
  };
}

function getPlacementOutcome(game: DashboardGameLike) {
  return deriveGamePlacementOutcome({
    scoringMode: game.scoringMode,
    participants: game.players.map((player) => ({
      userId: player.userId,
      score: player.score,
    })),
    resultPlacements: game.resultPlacements ?? [],
    winnerUserIds: (game.winners ?? []).map((winner) => winner.userId),
    suppressAllTiedPlacement: game.completedRounds === 0,
  });
}
