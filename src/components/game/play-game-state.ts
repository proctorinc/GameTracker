import type { GameForPlayPage } from "@/lib/db/store/game.store";
import type { GameJoinRequestFull } from "@/lib/db/store/game-join-request.store";
import type { PlayerRankGameDelta } from "@/lib/db/store/player-rank.store";
import type { UserBase } from "@/lib/db/store/user.store";
import {
  applyRoundScores,
  getWinningUserIds,
  type RoundScoreInput,
} from "@/lib/game/v1";

export type PlayGameSnapshot = {
  canManageLiveGame: boolean;
  currentUserId: string;
  gameSharePath: string | null;
  isCreator: boolean;
  isManager: boolean;
  pendingJoinRequests: GameJoinRequestFull[];
  playerOptions: UserBase[];
  playerRankDeltas: PlayerRankGameDelta[];
  game: GameForPlayPage;
};

export type PlayGameMutation =
  | {
      type: "upsert-score";
      roundNumber: number;
      userId: string;
      scoreDelta: number;
    }
  | {
      type: "commit-round";
      completeGame: boolean;
      finishedAt: string;
      winnerUserIds?: string[];
      placementSelections?: Array<{
        placement: 1 | 2 | 3;
        userIds: string[];
      }>;
    }
  | {
      type: "reopen-game";
    }
  | {
      type: "add-player";
      user: UserBase;
      gamePlayerId: string;
      startingScore: number;
      previousRoundNumber: number | null;
    }
  | {
      type: "add-guest";
      user: UserBase;
      gamePlayerId: string;
      startingScore: number;
      previousRoundNumber: number | null;
    }
  | {
      type: "remove-player";
      userId: string;
    }
  | {
      type: "update-color";
      userId: string;
      color: string;
    }
  | {
      type: "pause-game";
      pausedAt: string;
      pausedNextUserId: string | null;
    }
  | {
      type: "resume-game";
    };

export function applyPlayGameMutations(
  snapshot: PlayGameSnapshot,
  mutations: PlayGameMutation[],
) {
  return mutations.reduce(applyPlayGameMutation, snapshot);
}

export function applyPlayGameMutation(
  snapshot: PlayGameSnapshot,
  mutation: PlayGameMutation,
) {
  switch (mutation.type) {
    case "upsert-score":
      return applyOptimisticScore(snapshot, mutation);
    case "commit-round":
      return applyOptimisticRoundCommit(snapshot, mutation);
    case "reopen-game":
      return applyOptimisticGameReopen(snapshot);
    case "add-player":
    case "add-guest":
      return applyOptimisticPlayer(snapshot, mutation);
    case "remove-player":
      return applyOptimisticPlayerRemoval(snapshot, mutation);
    case "update-color":
      return applyOptimisticColor(snapshot, mutation);
    case "pause-game":
      return applyOptimisticPause(snapshot, mutation);
    case "resume-game":
      return applyOptimisticResume(snapshot);
    default:
      return snapshot;
  }
}

function applyOptimisticScore(
  snapshot: PlayGameSnapshot,
  mutation: Extract<PlayGameMutation, { type: "upsert-score" }>,
) {
  if (snapshot.game.completedAt) {
    return snapshot;
  }

  const normalizedDelta = Math.trunc(mutation.scoreDelta);
  const player = snapshot.game.players.find(
    (entry) => entry.userId === mutation.userId,
  );

  if (!player) {
    return snapshot;
  }

  const existingRound = snapshot.game.rounds.find(
    (round) => round.roundNumber === mutation.roundNumber,
  );
  const round =
    existingRound ??
    buildOptimisticRound({
      gameId: snapshot.game.id,
      roundNumber: mutation.roundNumber,
    });

  const existingScore = round.scores.find(
    (score) => score.userId === mutation.userId,
  );
  const previousScoreDelta = existingScore?.scoreDelta ?? 0;
  const nextScore = existingScore
    ? {
        ...existingScore,
        scoreDelta: normalizedDelta,
      }
    : {
        id: `optimistic-score-${round.id}-${mutation.userId}`,
        gameRoundId: round.id,
        userId: mutation.userId,
        scoreDelta: normalizedDelta,
        createdAt: nowIso(),
        user: player.user,
      };

  return {
    ...snapshot,
    game: {
      ...snapshot.game,
      players: snapshot.game.players.map((entry) =>
        entry.userId === mutation.userId
          ? {
              ...entry,
              score: (entry.score ?? 0) + (normalizedDelta - previousScoreDelta),
            }
          : entry,
      ),
      rounds: upsertRound(snapshot.game.rounds, {
        ...round,
        scores: upsertRoundScore(round.scores, nextScore),
      }),
    },
  };
}

function applyOptimisticRoundCommit(
  snapshot: PlayGameSnapshot,
  mutation: Extract<PlayGameMutation, { type: "commit-round" }>,
) {
  if (snapshot.game.completedAt) {
    return snapshot;
  }

  const nextRoundNumber = snapshot.game.completedRounds + 1;
  const existingRound = snapshot.game.rounds.find(
    (round) => round.roundNumber === nextRoundNumber,
  );
  const round =
    existingRound ??
    buildOptimisticRound({
      gameId: snapshot.game.id,
      roundNumber: nextRoundNumber,
      completedAt: mutation.finishedAt,
    });

  const nextGame = {
    ...snapshot.game,
    completedRounds: snapshot.game.completedRounds + 1,
    completedAt: mutation.completeGame ? mutation.finishedAt : null,
    rounds: upsertRound(snapshot.game.rounds, {
      ...round,
      completedAt: mutation.finishedAt,
    }),
  };

  if (!mutation.completeGame) {
    return {
      ...snapshot,
      game: nextGame,
    };
  }

  const winnerIds =
    nextGame.scoringMode === "no_score"
      ? Array.from(
          new Set(
            mutation.placementSelections?.find(
              (selection) => selection.placement === 1,
            )?.userIds ?? mutation.winnerUserIds ?? [],
          ),
        )
      : getWinningUserIds({
          players: nextGame.players.map((player) => ({
            userId: player.userId,
            score: player.score ?? 0,
          })),
          scoringMode: nextGame.scoringMode,
        });

  return {
    ...snapshot,
    game: {
      ...nextGame,
      resultPlacements:
        nextGame.scoringMode === "no_score"
          ? (mutation.placementSelections ?? [])
              .flatMap((selection) =>
                selection.userIds.map((userId) => ({
                  gameId: nextGame.id,
                  userId,
                  placement: selection.placement,
                  createdAt: mutation.finishedAt,
                })),
              )
          : nextGame.resultPlacements,
      winners: winnerIds
        .map((userId) => {
          const player = nextGame.players.find((entry) => entry.userId === userId);

          if (!player) {
            return null;
          }

          return {
            gameId: nextGame.id,
            userId,
            createdAt: mutation.finishedAt,
            user: player.user,
          };
        })
        .filter((winner) => winner !== null),
    },
  };
}

function applyOptimisticGameReopen(snapshot: PlayGameSnapshot) {
  if (!snapshot.game.completedAt) {
    return snapshot;
  }

  return {
    ...snapshot,
    game: {
      ...snapshot.game,
      completedAt: null,
      resultPlacements: [],
      winners: [],
    },
  };
}

function applyOptimisticPlayer(
  snapshot: PlayGameSnapshot,
  mutation: Extract<
    PlayGameMutation,
    { type: "add-player" } | { type: "add-guest" }
  >,
) {
  const alreadyInGame = snapshot.game.players.some(
    (player) => player.userId === mutation.user.id,
  );

  if (alreadyInGame) {
    return snapshot;
  }

  return {
    ...snapshot,
    game: {
      ...snapshot.game,
      players: [
        ...snapshot.game.players,
        {
          id: mutation.gamePlayerId,
          gameId: snapshot.game.id,
          isManager: false,
          userId: mutation.user.id,
          score: mutation.startingScore,
          user: mutation.user,
        },
      ],
      rounds:
        mutation.previousRoundNumber === null
          ? snapshot.game.rounds
          : snapshot.game.rounds.map((round) =>
              round.roundNumber === mutation.previousRoundNumber
                ? {
                    ...round,
                    scores: upsertRoundScore(round.scores, {
                      id: `optimistic-score-${round.id}-${mutation.user.id}`,
                      gameRoundId: round.id,
                      userId: mutation.user.id,
                      scoreDelta: mutation.startingScore,
                      createdAt: nowIso(),
                      user: mutation.user,
                    }),
                  }
                : round,
            ),
    },
  };
}

function applyOptimisticColor(
  snapshot: PlayGameSnapshot,
  mutation: Extract<PlayGameMutation, { type: "update-color" }>,
) {
  return {
    ...snapshot,
    playerOptions: snapshot.playerOptions.map((player) =>
      player.id === mutation.userId
        ? {
            ...player,
            color: mutation.color,
          }
        : player,
    ),
    game: {
      ...snapshot.game,
      players: snapshot.game.players.map((player) =>
        player.userId === mutation.userId
          ? {
              ...player,
              user: {
                ...player.user,
                color: mutation.color,
              },
            }
          : player,
      ),
      winners: snapshot.game.winners.map((winner) =>
        winner.userId === mutation.userId
          ? {
              ...winner,
              user: {
                ...winner.user,
                color: mutation.color,
              },
            }
          : winner,
      ),
      rounds: snapshot.game.rounds.map((round) => ({
        ...round,
        scores: round.scores.map((score) =>
          score.userId === mutation.userId
            ? {
                ...score,
                user: {
                  ...score.user,
                  color: mutation.color,
                },
              }
            : score,
        ),
      })),
    },
  };
}

function applyOptimisticPause(
  snapshot: PlayGameSnapshot,
  mutation: Extract<PlayGameMutation, { type: "pause-game" }>,
) {
  if (snapshot.game.completedAt) {
    return snapshot;
  }

  return {
    ...snapshot,
    game: {
      ...snapshot.game,
      pausedAt: mutation.pausedAt,
      pausedNextUserId: mutation.pausedNextUserId,
    },
  };
}

function applyOptimisticResume(snapshot: PlayGameSnapshot) {
  if (snapshot.game.completedAt || !snapshot.game.pausedAt) {
    return snapshot;
  }

  return {
    ...snapshot,
    game: {
      ...snapshot.game,
      pausedAt: null,
      pausedNextUserId: null,
    },
  };
}

function applyOptimisticPlayerRemoval(
  snapshot: PlayGameSnapshot,
  mutation: Extract<PlayGameMutation, { type: "remove-player" }>,
) {
  return {
    ...snapshot,
    game: {
      ...snapshot.game,
      players: snapshot.game.players.filter(
        (player) => player.userId !== mutation.userId,
      ),
      winners: snapshot.game.winners.filter(
        (winner) => winner.userId !== mutation.userId,
      ),
      rounds: snapshot.game.rounds.map((round) => ({
        ...round,
        scores: round.scores.filter((score) => score.userId !== mutation.userId),
      })),
    },
  };
}

function upsertRound(
  rounds: PlayGameSnapshot["game"]["rounds"],
  round: PlayGameSnapshot["game"]["rounds"][number],
) {
  const existingIndex = rounds.findIndex((entry) => entry.id === round.id);

  if (existingIndex === -1) {
    return [...rounds, round];
  }

  return rounds.map((entry, index) => (index === existingIndex ? round : entry));
}

function upsertRoundScore(
  scores: PlayGameSnapshot["game"]["rounds"][number]["scores"],
  score: PlayGameSnapshot["game"]["rounds"][number]["scores"][number],
) {
  const existingIndex = scores.findIndex((entry) => entry.id === score.id);

  if (existingIndex === -1) {
    return [...scores, score];
  }

  return scores.map((entry, index) => (index === existingIndex ? score : entry));
}

function buildOptimisticRound(input: {
  gameId: string;
  roundNumber: number;
  completedAt?: string;
}) {
  const timestamp = input.completedAt ?? nowIso();

  return {
    id: `optimistic-round-${input.gameId}-${input.roundNumber}`,
    gameId: input.gameId,
    roundNumber: input.roundNumber,
    createdAt: timestamp,
    completedAt: timestamp,
    scores: [],
  };
}

export function projectCommittedGame(
  snapshot: PlayGameSnapshot,
  roundScores: RoundScoreInput[],
) {
  const nextGame = applyRoundScores(
    {
      scoringMode: snapshot.game.scoringMode,
      endingMode: snapshot.game.endingMode,
      targetRounds: snapshot.game.targetRounds,
      scoreThreshold: snapshot.game.scoreThreshold,
      scoreThresholdDirection: snapshot.game.scoreThresholdDirection,
      completedRounds: snapshot.game.completedRounds,
      players: snapshot.game.players.map((player) => ({
        userId: player.userId,
        score: player.score ?? 0,
      })),
    },
    roundScores,
  );

  return nextGame.players;
}

function nowIso() {
  return new Date().toISOString();
}
