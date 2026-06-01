export type GameScoringMode = "highest_wins" | "lowest_wins" | "no_score";
export type GameEndingMode = "none" | "round_count" | "score_threshold";
export type GameScoreThresholdDirection = "at_least" | "at_most" | null;

export type ScoreLikePlayer = {
  userId: string;
  score: number;
};

export type RoundScoreInput = {
  userId: string;
  scoreDelta: number;
};

export type V1GameLike = {
  scoringMode: GameScoringMode;
  endingMode: GameEndingMode;
  targetRounds: number | null;
  scoreThreshold: number | null;
  scoreThresholdDirection: GameScoreThresholdDirection;
  completedRounds: number;
  players: ScoreLikePlayer[];
};

export function hasGameMetScoreThreshold(game: V1GameLike) {
  if (game.endingMode !== "score_threshold" || game.scoreThreshold === null) {
    return false;
  }

  const scoreThreshold = game.scoreThreshold;

  if (game.scoreThresholdDirection === "at_most") {
    return game.players.some((player) => player.score <= scoreThreshold);
  }

  return game.players.some((player) => player.score >= scoreThreshold);
}

export function willGameOfferRoundPrompt(game: V1GameLike) {
  if (game.endingMode === "none") {
    return true;
  }

  if (
    game.endingMode === "round_count" &&
    game.targetRounds !== null &&
    game.completedRounds + 1 >= game.targetRounds
  ) {
    return true;
  }

  return hasGameMetScoreThreshold(game);
}

export function getWinningUserIds(
  game: Pick<V1GameLike, "players" | "scoringMode">,
) {
  if (game.players.length === 0) {
    return [];
  }

  if (game.scoringMode === "no_score") {
    return [];
  }

  const targetScore =
    game.scoringMode === "highest_wins"
      ? Math.max(...game.players.map((player) => player.score))
      : Math.min(...game.players.map((player) => player.score));

  return game.players
    .filter((player) => player.score === targetScore)
    .map((player) => player.userId);
}

export function applyRoundScores(
  game: V1GameLike,
  roundScores: RoundScoreInput[],
): V1GameLike {
  const deltasByUserId = new Map(
    roundScores.map((score) => [score.userId, score.scoreDelta]),
  );

  return {
    ...game,
    completedRounds: game.completedRounds + 1,
    players: game.players.map((player) => ({
      ...player,
      score: player.score + (deltasByUserId.get(player.userId) ?? 0),
    })),
  };
}
