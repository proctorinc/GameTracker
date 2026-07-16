import type { PlayGameSnapshot } from "@/components/game/play-game-state";
import { getStoredGamePlayerRole } from "@/lib/game/player-roles";
import type { GamePlayerRole } from "@/lib/db/schema";

export type RemotePlayGameEvent =
  | {
      type: "score-updated";
      userId: string;
      roundNumber: number | null;
      localKeys: string[];
    }
  | {
      type: "round-committed";
      roundNumber: number;
      localKeys: string[];
    }
  | {
      type: "game-completed";
      roundNumber: number;
      localKeys: string[];
    }
  | {
      type: "game-reopened";
      localKeys: string[];
    }
  | {
      type: "player-added";
      userId: string;
      localKeys: string[];
    }
  | {
      type: "player-removed";
      userId: string;
      localKeys: string[];
    }
  | {
      type: "manager-changed";
      userId: string;
      isManager: boolean;
      localKeys: string[];
    }
  | {
      type: "role-changed";
      userId: string;
      role: GamePlayerRole;
      localKeys: string[];
    }
  | {
      type: "guest-color-updated";
      userId: string;
      color: string;
      localKeys: string[];
    }
  | {
      type: "game-paused";
      pausedNextUserId: string | null;
      localKeys: string[];
    }
  | {
      type: "game-resumed";
      localKeys: string[];
    }
  | {
      type: "paused-next-turn-updated";
      userId: string | null;
      localKeys: string[];
    };

export type RemoteHighlightTarget = {
  gameStatus: boolean;
  playerIds: string[];
  roster: boolean;
  scoreUserIds: string[];
};

type ScoreEntry = {
  roundNumber: number;
  userId: string;
  scoreDelta: number;
};

function buildScoreMap(snapshot: PlayGameSnapshot) {
  const entries = new Map<string, ScoreEntry>();

  for (const round of snapshot.game.rounds) {
    for (const score of round.scores) {
      entries.set(`${round.roundNumber}:${score.userId}`, {
        roundNumber: round.roundNumber,
        userId: score.userId,
        scoreDelta: score.scoreDelta,
      });
    }
  }

  return entries;
}

export function deriveRemotePlayGameEvents(input: {
  previousSnapshot: PlayGameSnapshot;
  nextSnapshot: PlayGameSnapshot;
}) {
  const events: RemotePlayGameEvent[] = [];
  const scoreUpdateUserIds = new Set<string>();
  const previousPlayers = new Map(
    input.previousSnapshot.game.players.map((player) => [player.userId, player]),
  );
  const nextPlayers = new Map(
    input.nextSnapshot.game.players.map((player) => [player.userId, player]),
  );
  const previousScores = buildScoreMap(input.previousSnapshot);
  const nextScores = buildScoreMap(input.nextSnapshot);

  for (const [scoreKey, nextScore] of nextScores) {
    const previousScore = previousScores.get(scoreKey);

    if (!previousScore || previousScore.scoreDelta !== nextScore.scoreDelta) {
      events.push({
        type: "score-updated",
        userId: nextScore.userId,
        roundNumber: nextScore.roundNumber,
        localKeys: [
          `score:${nextScore.userId}`,
          `round-score:${nextScore.roundNumber}:${nextScore.userId}`,
        ],
      });
      scoreUpdateUserIds.add(nextScore.userId);
    }
  }

  if (!input.previousSnapshot.game.completedAt && input.nextSnapshot.game.completedAt) {
    events.push({
      type: "game-completed",
      roundNumber: input.nextSnapshot.game.completedRounds,
      localKeys: ["commit-round"],
    });
  } else if (
    input.previousSnapshot.game.completedAt &&
    !input.nextSnapshot.game.completedAt
  ) {
    events.push({
      type: "game-reopened",
      localKeys: ["reopen-game"],
    });
  } else if (
    input.nextSnapshot.game.completedRounds >
    input.previousSnapshot.game.completedRounds
  ) {
    events.push({
      type: "round-committed",
      roundNumber: input.nextSnapshot.game.completedRounds,
      localKeys: ["commit-round"],
    });
  }

  if (!input.previousSnapshot.game.pausedAt && input.nextSnapshot.game.pausedAt) {
    events.push({
      type: "game-paused",
      pausedNextUserId: input.nextSnapshot.game.pausedNextUserId ?? null,
      localKeys: ["pause-game"],
    });
  } else if (
    input.previousSnapshot.game.pausedAt &&
    !input.nextSnapshot.game.pausedAt
  ) {
    events.push({
      type: "game-resumed",
      localKeys: ["resume-game"],
    });
  } else if (
    input.previousSnapshot.game.pausedAt &&
    input.nextSnapshot.game.pausedAt &&
    input.previousSnapshot.game.pausedNextUserId !==
      input.nextSnapshot.game.pausedNextUserId
  ) {
    events.push({
      type: "paused-next-turn-updated",
      userId: input.nextSnapshot.game.pausedNextUserId ?? null,
      localKeys: ["pause-game"],
    });
  }

  for (const [userId, nextPlayer] of nextPlayers) {
    const previousPlayer = previousPlayers.get(userId);

    if (!previousPlayer) {
      events.push({
        type: "player-added",
        userId,
        localKeys: [`add-player:${userId}`],
      });
      continue;
    }

    if (
      previousPlayer.score !== nextPlayer.score &&
      !scoreUpdateUserIds.has(userId)
    ) {
      events.push({
        type: "score-updated",
        userId,
        roundNumber: null,
        localKeys: [`score:${userId}`],
      });
      scoreUpdateUserIds.add(userId);
    }

    if (previousPlayer.isManager !== nextPlayer.isManager) {
      events.push({
        type: "manager-changed",
        userId,
        isManager: nextPlayer.isManager,
        localKeys: [`manager:${userId}`],
      });
    }

    if (
      getStoredGamePlayerRole(previousPlayer) !==
      getStoredGamePlayerRole(nextPlayer)
    ) {
      events.push({
        type: "role-changed",
        userId,
        role: getStoredGamePlayerRole(nextPlayer),
        localKeys: [`set-role:${userId}`],
      });
    }

    if (previousPlayer.user.color !== nextPlayer.user.color) {
      events.push({
        type: "guest-color-updated",
        userId,
        color: nextPlayer.user.color,
        localKeys: [`color:${userId}`],
      });
    }
  }

  for (const [userId] of previousPlayers) {
    if (!nextPlayers.has(userId)) {
      events.push({
        type: "player-removed",
        userId,
        localKeys: [`remove-player:${userId}`],
      });
    }
  }

  return events;
}

export function filterLocalRemotePlayGameEvents(input: {
  events: RemotePlayGameEvent[];
  localKeys: Set<string>;
}) {
  return input.events.filter(
    (event) => !event.localKeys.some((key) => input.localKeys.has(key)),
  );
}

export function getRemoteHighlightTarget(events: RemotePlayGameEvent[]) {
  const playerIds = new Set<string>();
  const scoreUserIds = new Set<string>();
  let roster = false;
  let gameStatus = false;

  for (const event of events) {
    switch (event.type) {
      case "score-updated":
        playerIds.add(event.userId);
        scoreUserIds.add(event.userId);
        break;
      case "player-added":
      case "manager-changed":
      case "role-changed":
      case "guest-color-updated":
        playerIds.add(event.userId);
        roster = true;
        break;
      case "player-removed":
        roster = true;
        break;
      case "round-committed":
      case "game-completed":
      case "game-reopened":
      case "game-paused":
      case "game-resumed":
      case "paused-next-turn-updated":
        gameStatus = true;
        if (event.type === "game-paused" && event.pausedNextUserId) {
          playerIds.add(event.pausedNextUserId);
        }
        if (event.type === "paused-next-turn-updated" && event.userId) {
          playerIds.add(event.userId);
        }
        break;
      default:
        break;
    }
  }

  return {
    gameStatus,
    playerIds: Array.from(playerIds),
    roster,
    scoreUserIds: Array.from(scoreUserIds),
  } satisfies RemoteHighlightTarget;
}

export function summarizeRemotePlayGameEvents(events: RemotePlayGameEvent[]) {
  const summaries: string[] = [];
  const hasScoreUpdate = events.some((event) => event.type === "score-updated");
  const hasRoundCommit = events.some((event) => event.type === "round-committed");
  const hasGameCompleted = events.some((event) => event.type === "game-completed");
  const hasGameReopened = events.some((event) => event.type === "game-reopened");
  const hasGamePaused = events.some((event) => event.type === "game-paused");
  const hasGameResumed = events.some((event) => event.type === "game-resumed");
  const hasPausedNextTurnUpdate = events.some(
    (event) => event.type === "paused-next-turn-updated",
  );
  const hasPlayerAdded = events.some((event) => event.type === "player-added");
  const hasPlayerRemoved = events.some((event) => event.type === "player-removed");
  const hasManagerChanged = events.some((event) => event.type === "manager-changed");
  const hasRoleChanged = events.some((event) => event.type === "role-changed");
  const hasColorUpdate = events.some(
    (event) => event.type === "guest-color-updated",
  );

  if (hasGameCompleted) {
    summaries.push("Game completed");
  } else if (hasGameReopened) {
    summaries.push("Game reopened");
  } else if (hasGamePaused) {
    summaries.push("Game paused");
  } else if (hasGameResumed) {
    summaries.push("Game resumed");
  } else if (hasRoundCommit) {
    summaries.push("Round completed");
  }

  if (hasPausedNextTurnUpdate) {
    summaries.push("Next turn updated");
  }

  if (hasScoreUpdate) {
    summaries.push(
      events.filter((event) => event.type === "score-updated").length > 1
        ? "Scores updated"
        : "Score updated",
    );
  }

  if (hasPlayerAdded) {
    summaries.push("Player added");
  }

  if (hasPlayerRemoved) {
    summaries.push("Player removed");
  }

  if (hasManagerChanged || hasRoleChanged) {
    summaries.push("Player role updated");
  }

  if (hasColorUpdate) {
    summaries.push("Player color updated");
  }

  return summaries.slice(0, 2);
}
