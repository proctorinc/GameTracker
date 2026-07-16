import type { PlayGameSnapshot } from "@/components/game/play-game-state";
import type { PlayGameV2Config, PlayGameV2ViewModel } from "./types";

function getPlayerScore(player: { score: number | null | undefined }) {
  return player.score ?? 0;
}

export function buildPlayGameV2ViewModel(input: {
  config: PlayGameV2Config;
  snapshot: PlayGameSnapshot;
}): PlayGameV2ViewModel {
  const { game } = input.snapshot;
  const sortedPlayers = [...game.players];
  const sortedRounds = [...game.rounds].sort(
    (left, right) => right.roundNumber - left.roundNumber,
  );
  const activeEliminations =
    input.config.settings.scoringType === "elimination" &&
    input.config.settings.roundConfig.enabled
      ? game.eliminations.filter(
          (entry) => entry.roundNumber === game.completedRounds + 1,
        )
      : game.eliminations;

  if (game.scoringMode === "no_score") {
    const eliminatedSet = new Set(
      activeEliminations.map((entry) => entry.eliminatedUserId),
    );
    sortedPlayers.sort((left, right) => {
      const leftEliminated = eliminatedSet.has(left.userId);
      const rightEliminated = eliminatedSet.has(right.userId);

      if (leftEliminated === rightEliminated) {
        return (left.user.firstName ?? "").localeCompare(
          right.user.firstName ?? "",
        );
      }

      return leftEliminated ? 1 : -1;
    });
  } else {
    sortedPlayers.sort((left, right) =>
      game.scoringMode === "highest_wins"
        ? getPlayerScore(right) - getPlayerScore(left)
        : getPlayerScore(left) - getPlayerScore(right),
    );
  }

  const topScore =
    game.scoringMode === "no_score"
      ? null
      : sortedPlayers.length > 0
        ? getPlayerScore(sortedPlayers[0]!)
        : null;
  const leaderUserIds =
    topScore === null
      ? []
      : sortedPlayers
          .filter((player) => getPlayerScore(player) === topScore)
          .map((player) => player.userId);

  const eliminatedSet = new Set(
    activeEliminations.map((entry) => entry.eliminatedUserId),
  );

  return {
    activeRoundNumber: game.completedRounds + 1,
    isCompleted: Boolean(game.completedAt),
    isPaused: Boolean(game.pausedAt),
    leaderUserIds,
    remainingPlayerIds: game.players
      .map((player) => player.userId)
      .filter((userId) => !eliminatedSet.has(userId)),
    sortedPlayers,
    sortedRounds,
    tiedLeaderIds: leaderUserIds.length > 1 ? leaderUserIds : [],
  };
}
