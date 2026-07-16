import type { GameScoringMode } from "@/lib/db/schema";

export type PlacementParticipant = {
  userId: string;
  score: number | null | undefined;
};

export type PlacementRecord = {
  userId: string;
  placement: number;
};

export type GamePlacementOutcome = {
  placementByUserId: Record<string, number>;
  winnerUserIds: string[];
  wonByUserId: Record<string, boolean>;
  hasExplicitPodium: boolean;
};

function uniqueUserIds(userIds: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      userIds
        .map((userId) => userId?.trim() ?? "")
        .filter((userId) => userId.length > 0),
    ),
  );
}

function createScoredPlacementMap(input: {
  participants: PlacementParticipant[];
  scoringMode: Exclude<GameScoringMode, "no_score">;
  suppressAllTiedPlacement?: boolean;
}) {
  if (input.participants.length === 0) {
    return {};
  }

  if (
    input.suppressAllTiedPlacement &&
    input.participants.every(
      (participant) => participant.score === input.participants[0]?.score,
    )
  ) {
    return {};
  }

  const sortedParticipants = [...input.participants].sort((left, right) => {
    const leftScore = left.score ?? Number.POSITIVE_INFINITY;
    const rightScore = right.score ?? Number.POSITIVE_INFINITY;

    return input.scoringMode === "highest_wins"
      ? rightScore - leftScore
      : leftScore - rightScore;
  });
  let placement = 0;
  let lastScore: number | null = null;
  const placementByUserId: Record<string, number> = {};

  for (const participant of sortedParticipants) {
    if (participant.score === null || participant.score === undefined) {
      continue;
    }

    if (lastScore === null || participant.score !== lastScore) {
      placement += 1;
      lastScore = participant.score;
    }

    placementByUserId[participant.userId] = placement;
  }

  return placementByUserId;
}

export function deriveGamePlacementOutcome(input: {
  scoringMode: GameScoringMode;
  participants: PlacementParticipant[];
  resultPlacements?: PlacementRecord[] | null;
  winnerUserIds?: string[] | null;
  suppressAllTiedPlacement?: boolean;
}): GamePlacementOutcome {
  const allowedUserIds = new Set(
    input.participants.map((participant) => participant.userId),
  );

  const explicitPlacements = (input.resultPlacements ?? [])
    .filter(
      (placement) =>
        allowedUserIds.has(placement.userId) && placement.placement > 0,
    )
    .sort((left, right) => {
      if (left.placement !== right.placement) {
        return left.placement - right.placement;
      }

      return left.userId.localeCompare(right.userId);
    });

  if (input.scoringMode === "no_score" || explicitPlacements.length > 0) {
    const placementByUserId = Object.fromEntries(
      explicitPlacements.map((placement) => [
        placement.userId,
        placement.placement,
      ]),
    ) as Record<string, number>;
    const hasExplicitPodium = explicitPlacements.some(
      (placement) => placement.placement > 1,
    );
    const winnerUserIds =
      explicitPlacements.filter((placement) => placement.placement === 1).length > 0
        ? uniqueUserIds(
            explicitPlacements
              .filter((placement) => placement.placement === 1)
              .map((placement) => placement.userId),
          )
        : uniqueUserIds(input.winnerUserIds ?? []).filter((userId) =>
            allowedUserIds.has(userId),
          );

    for (const winnerUserId of winnerUserIds) {
      placementByUserId[winnerUserId] ??= 1;
    }

    const wonByUserId = Object.fromEntries(
      winnerUserIds.map((userId) => [userId, true] as const),
    ) as Record<string, boolean>;

    return {
      placementByUserId,
      winnerUserIds,
      wonByUserId,
      hasExplicitPodium,
    };
  }

  const placementByUserId = createScoredPlacementMap({
    participants: input.participants,
    scoringMode: input.scoringMode,
    suppressAllTiedPlacement: input.suppressAllTiedPlacement,
  });
  const winnerUserIds = Object.entries(placementByUserId)
    .filter(([, placement]) => placement === 1)
    .map(([userId]) => userId);
  const wonByUserId = Object.fromEntries(
    winnerUserIds.map((userId) => [userId, true] as const),
  ) as Record<string, boolean>;

  return {
    placementByUserId,
    winnerUserIds,
    wonByUserId,
    hasExplicitPodium: false,
  };
}

export function formatPlacementLabel(input: {
  placement: number | null;
  won: boolean;
  hasExplicitPodium: boolean;
}) {
  if (input.placement === null) {
    return null;
  }

  if (input.won && input.placement === 1 && !input.hasExplicitPodium) {
    return "Won";
  }

  const mod100 = input.placement % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${input.placement}th`;
  }

  switch (input.placement % 10) {
    case 1:
      return `${input.placement}st`;
    case 2:
      return `${input.placement}nd`;
    case 3:
      return `${input.placement}rd`;
    default:
      return `${input.placement}th`;
  }
}
