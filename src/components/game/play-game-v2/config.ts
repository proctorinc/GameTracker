import type { GameForPlayPage } from "@/lib/db/store/game.store";
import {
  isGameSettingsV2Elimination,
  isGameSettingsV2EndGameTally,
  parseGameSettingsV2,
  usesWinnerSelection,
  usesGameSettingsV2ItemizedScoring,
} from "@/lib/game/v2";
import type { PlayGameV2Config } from "./types";

export function buildPlayGameV2Config(game: Pick<GameForPlayPage, "settingsJson">) {
  const settings = parseGameSettingsV2(game.settingsJson);

  if (!settings) {
    throw new Error("Missing v2 game settings");
  }

  const supportsEliminationFlow = isGameSettingsV2Elimination(settings);
  const supportsEndGameTally = isGameSettingsV2EndGameTally(settings);
  const supportsRoundWinnerSelection = usesWinnerSelection(settings);
  const supportsLiveScoreEntry =
    settings.scoringType === "points" &&
    !usesGameSettingsV2ItemizedScoring(settings) &&
    !supportsRoundWinnerSelection;
  const variant: PlayGameV2Config["variant"] = supportsEliminationFlow
    ? "elimination"
    : supportsEndGameTally
      ? "end-game-tally"
      : supportsRoundWinnerSelection
        ? "round-winner"
        : "incremental";

  return {
    settings,
    supportsEliminationFlow,
    supportsEndGameTally,
    supportsLiveScoreEntry,
    supportsRoundWinnerSelection,
    requiresPlacementTieBreak:
      !settings.tiePolicy.allowTies &&
      settings.tiePolicy.resolution === "manual_placement_override",
    showsRounds: settings.roundConfig.enabled,
    canCommitRound: settings.roundConfig.enabled,
    canFinishGame: true,
    itemizedCategories: settings.itemizedCategories,
    variant,
  } satisfies PlayGameV2Config;
}
