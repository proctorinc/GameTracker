export type ScoreBreakdownChartPlayer = {
  userId: string;
  score: number | null | undefined;
};

export type ScoreBreakdownChartRound = {
  roundNumber: number;
  scores: Array<{
    userId: string;
    scoreDelta: number;
  }>;
};

export type ScoreBreakdownChartPoint = {
  roundLabel: string;
  roundNumber: number;
  value: number;
};

export type ScoreBreakdownChartSeries = {
  userId: string;
  points: ScoreBreakdownChartPoint[];
};

/**
 * Reconstructs each player's score before the first visible round from their
 * current total, then walks the recorded round deltas forward.
 */
export function buildCumulativeScoreSeries(input: {
  players: ScoreBreakdownChartPlayer[];
  rounds: ScoreBreakdownChartRound[];
}): ScoreBreakdownChartSeries[] {
  const rounds = [...input.rounds].sort(
    (left, right) => left.roundNumber - right.roundNumber,
  );

  return input.players.map((player) => {
    const recordedDelta = rounds.reduce(
      (roundTotal, round) =>
        roundTotal +
        round.scores.reduce(
          (scoreTotal, score) =>
            score.userId === player.userId
              ? scoreTotal + score.scoreDelta
              : scoreTotal,
          0,
        ),
      0,
    );
    let cumulativeScore = (player.score ?? 0) - recordedDelta;
    const points: ScoreBreakdownChartPoint[] = [
      {
        roundLabel: "Start",
        roundNumber: 0,
        value: cumulativeScore,
      },
    ];

    for (const round of rounds) {
      cumulativeScore += round.scores.reduce(
        (scoreTotal, score) =>
          score.userId === player.userId
            ? scoreTotal + score.scoreDelta
            : scoreTotal,
        0,
      );
      points.push({
        roundLabel: `R${round.roundNumber}`,
        roundNumber: round.roundNumber,
        value: cumulativeScore,
      });
    }

    return {
      userId: player.userId,
      points,
    };
  });
}
