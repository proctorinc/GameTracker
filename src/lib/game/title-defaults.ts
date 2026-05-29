import type {
  GameEndingMode,
  GameScoreThresholdDirection,
  GameScoringMode,
} from "@/lib/db/schema";

export type ConcreteGameSettings = {
  scoringMode: GameScoringMode;
  endingMode: GameEndingMode;
  targetRounds: number;
  scoreThreshold: number;
  scoreThresholdDirection: GameScoreThresholdDirection;
};

export type GameTitleDefaultSettings = {
  defaultScoringMode: GameScoringMode | null;
  defaultEndingMode: GameEndingMode | null;
  defaultTargetRounds: number | null;
  defaultScoreThreshold: number | null;
  defaultScoreThresholdDirection: GameScoreThresholdDirection | null;
};

export const APP_GAME_SETTINGS_DEFAULTS: ConcreteGameSettings = {
  scoringMode: "highest_wins",
  endingMode: "none",
  targetRounds: 1,
  scoreThreshold: 100,
  scoreThresholdDirection: "at_least",
};

function normalizePositiveInteger(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.trunc(value);
  return rounded > 0 ? rounded : null;
}

export function resolveGameSettingsDefaults(
  defaults?: Partial<GameTitleDefaultSettings> | null,
): ConcreteGameSettings {
  return {
    scoringMode:
      defaults?.defaultScoringMode ?? APP_GAME_SETTINGS_DEFAULTS.scoringMode,
    endingMode:
      defaults?.defaultEndingMode ?? APP_GAME_SETTINGS_DEFAULTS.endingMode,
    targetRounds:
      normalizePositiveInteger(defaults?.defaultTargetRounds) ??
      APP_GAME_SETTINGS_DEFAULTS.targetRounds,
    scoreThreshold:
      normalizePositiveInteger(defaults?.defaultScoreThreshold) ??
      APP_GAME_SETTINGS_DEFAULTS.scoreThreshold,
    scoreThresholdDirection:
      defaults?.defaultScoreThresholdDirection ??
      APP_GAME_SETTINGS_DEFAULTS.scoreThresholdDirection,
  };
}

export function normalizeGameTitleDefaults(
  input: Partial<GameTitleDefaultSettings>,
): GameTitleDefaultSettings {
  const defaultEndingMode = input.defaultEndingMode ?? null;

  return {
    defaultScoringMode: input.defaultScoringMode ?? null,
    defaultEndingMode,
    defaultTargetRounds:
      defaultEndingMode === "round_count"
        ? normalizePositiveInteger(input.defaultTargetRounds)
        : null,
    defaultScoreThreshold:
      defaultEndingMode === "score_threshold"
        ? normalizePositiveInteger(input.defaultScoreThreshold)
        : null,
    defaultScoreThresholdDirection:
      defaultEndingMode === "score_threshold"
        ? (input.defaultScoreThresholdDirection ?? null)
        : null,
  };
}

export function gameSettingsToTitleDefaults(
  settings: Pick<
    ConcreteGameSettings,
    | "scoringMode"
    | "endingMode"
    | "targetRounds"
    | "scoreThreshold"
    | "scoreThresholdDirection"
  >,
): GameTitleDefaultSettings {
  return normalizeGameTitleDefaults({
    defaultScoringMode: settings.scoringMode,
    defaultEndingMode: settings.endingMode,
    defaultTargetRounds: settings.targetRounds,
    defaultScoreThreshold: settings.scoreThreshold,
    defaultScoreThresholdDirection: settings.scoreThresholdDirection,
  });
}

export function formatResolvedEndingSummary(settings: ConcreteGameSettings) {
  if (settings.endingMode === "round_count") {
    return `${settings.targetRounds} round${
      settings.targetRounds === 1 ? "" : "s"
    }`;
  }

  if (settings.endingMode === "score_threshold") {
    return `${
      settings.scoreThresholdDirection === "at_least" ? "At least" : "At most"
    } ${settings.scoreThreshold}`;
  }

  return "No rounds free play";
}
