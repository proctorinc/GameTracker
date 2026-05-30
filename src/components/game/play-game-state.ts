import type { GameForPlayPage } from "@/lib/db/store/game.store";
import type { UserBase } from "@/lib/db/store/user.store";
import {
  applyRoundScores,
  getWinningUserIds,
  type RoundScoreInput,
} from "@/lib/game/v1";

export type PlayGameSnapshot = {
  currentUserId: string;
  isCreator: boolean;
  playerOptions: UserBase[];
  game: GameForPlayPage;
};

export type PlayGameMutation =
  | {
      type: "upsert-score";
      userId: string;
      scoreDelta: number;
    }
  | {
      type: "commit-round";
      completeGame: boolean;
      finishedAt: string;
    }
  | {
      type: "add-player";
      user: UserBase;
      gamePlayerId: string;
    }
  | {
      type: "add-guest";
      user: UserBase;
      gamePlayerId: string;
    }
  | {
      type: "update-color";
      userId: string;
      color: string;
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
    case "add-player":
    case "add-guest":
      return applyOptimisticPlayer(snapshot, mutation);
    case "update-color":
      return applyOptimisticColor(snapshot, mutation);
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

  const nextRoundNumber = snapshot.game.completedRounds + 1;
  const existingRound = snapshot.game.rounds.find(
    (round) => round.roundNumber === nextRoundNumber,
  );
  const round =
    existingRound ??
    buildOptimisticRound({
      gameId: snapshot.game.id,
      roundNumber: nextRoundNumber,
    });

  const existingScore = round.scores.find(
    (score) => score.userId === mutation.userId,
  );
  const nextScore = existingScore
    ? {
        ...existingScore,
        scoreDelta: existingScore.scoreDelta + normalizedDelta,
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
              score: (entry.score ?? 0) + normalizedDelta,
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

  const winnerIds = getWinningUserIds({
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
          userId: mutation.user.id,
          score: 0,
          user: mutation.user,
        },
      ],
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
