import type {
  GameScoreThresholdDirection,
  GameScoringMode,
  GameVersion,
} from "@/lib/db/schema";
import {
  buildLegacyItemizedCategory,
  DEFAULT_SINGLE_INPUT_KEY,
  DEFAULT_SINGLE_INPUT_LABEL,
  normalizeItemizedInputDefinition,
  normalizeItemizedInputKey,
  validateSafeMathExpression,
  type ItemizedCategoryDefinition,
  type ItemizedCategoryInputDefinition,
} from "@/lib/game/itemized-scoring";

export const gameEndTriggers = [
  "rounds_exhausted",
  "points_threshold_reached",
  "resource_pool_depleted",
  "player_eliminated",
  "manual_finish",
] as const;
export type GameEndTrigger = (typeof gameEndTriggers)[number];

export const gameScoringTypes = [
  "points",
  "winner_selection",
  "elimination",
] as const;
export type GameScoringType = (typeof gameScoringTypes)[number];

export const gameWinMetrics = [
  "highest_score",
  "lowest_score",
  "last_man_standing",
  "objective_fulfilled",
] as const;
export type GameWinMetric = (typeof gameWinMetrics)[number];

export const gameTieResolutions = [
  "allow",
  "manual_winner_override",
  "manual_placement_override",
] as const;
export type GameTieResolution = (typeof gameTieResolutions)[number];

export type GameSettingsItemizedCategoryInput = ItemizedCategoryInputDefinition;

export type GameSettingsItemizedCategory = ItemizedCategoryDefinition;

export type LegacyGameSettingsItemizedCategory = {
  id?: string;
  name?: string;
  value?: number;
  sortOrder?: number;
};

export type GameSettingsItemizedCategoryDraft =
  | Partial<GameSettingsItemizedCategory>
  | (Partial<GameSettingsItemizedCategory> &
      LegacyGameSettingsItemizedCategory);

export type GameSettingsV2 = {
  version: "v2";
  gameEndTrigger: GameEndTrigger;
  scoringType: GameScoringType;
  winMetric: GameWinMetric;
  initialPlayerScore: number;
  roundConfig: {
    enabled: boolean;
    targetRounds: number | null;
  };
  thresholdConfig: {
    value: number | null;
    direction: GameScoreThresholdDirection | null;
  };
  tiePolicy: {
    allowTies: boolean;
    resolution: GameTieResolution;
  };
  playerConfig: {
    minPlayers: number | null;
    maxPlayers: number | null;
    allPlayersAreManagers: boolean;
  };
  itemizedCategories: GameSettingsItemizedCategory[];
  resourceConfig: Record<string, never>;
  objectiveConfig: Record<string, never>;
};

export type VersionedGameSettings = GameSettingsV2;

export const createGameSettingsTemplates = [
  "point_scoring",
  "choose_winner",
  "elimination",
] as const;
export type CreateGameSettingsTemplate =
  (typeof createGameSettingsTemplates)[number];

export const createGameSettingsSections = [
  "gameType",
  "gameplay",
  "winCondition",
  "endCondition",
  "tieBehavior",
] as const;
export type CreateGameSettingsSection =
  (typeof createGameSettingsSections)[number];

export type CreateGameSettingsTitleDefaultsSource = "v2" | "none";

export type CreateGameSettingsTitleSeed = {
  source: CreateGameSettingsTitleDefaultsSource;
  settings: GameSettingsV2;
  sectionsWithDefaults: Record<CreateGameSettingsSection, boolean>;
};

type LegacyGameScoringType =
  | "ranked_placement_only"
  | "incremental"
  | "end_game_tally";

type GameSettingsV2Input = Omit<
  Partial<GameSettingsV2>,
  "itemizedCategories" | "scoringType" | "roundConfig"
> & {
  scoringType?: GameScoringType | LegacyGameScoringType | null;
  roundConfig?: Partial<GameSettingsV2["roundConfig"]> & {
    requiresRoundWinner?: boolean | null;
  };
  itemizedCategories?: GameSettingsItemizedCategoryDraft[] | null;
};

type TitleDefaultsSeedInput = {
  defaultSettingsVersion?: GameVersion | null;
  defaultSettingsJson?: string | null;
};

export const DEFAULT_GAME_SETTINGS_V2: GameSettingsV2 = {
  version: "v2",
  gameEndTrigger: "manual_finish",
  scoringType: "points",
  winMetric: "highest_score",
  initialPlayerScore: 0,
  roundConfig: {
    enabled: false,
    targetRounds: null,
  },
  thresholdConfig: {
    value: null,
    direction: null,
  },
  tiePolicy: {
    allowTies: true,
    resolution: "allow",
  },
  playerConfig: {
    minPlayers: null,
    maxPlayers: null,
    allPlayersAreManagers: false,
  },
  itemizedCategories: [],
  resourceConfig: {},
  objectiveConfig: {},
};

export const DEFAULT_CREATE_GAME_SETTINGS_V2 = validateGameSettingsV2({
  gameEndTrigger: "manual_finish",
  scoringType: "points",
  winMetric: "highest_score",
  initialPlayerScore: 0,
  roundConfig: {
    enabled: true,
    targetRounds: null,
  },
  tiePolicy: {
    allowTies: true,
    resolution: "allow",
  },
});

function asFiniteInteger(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Math.trunc(value);
}

function normalizePositiveInteger(value: number | null | undefined) {
  const normalized = asFiniteInteger(value);
  return normalized !== null && normalized > 0 ? normalized : null;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized : null;
}

function normalizeInputs(
  category: GameSettingsItemizedCategoryDraft,
  index: number,
) {
  const providedInputs = (category.inputs ?? [])
    .map((input, inputIndex) =>
      normalizeItemizedInputDefinition(input, inputIndex),
    )
    .filter(
      (input): input is GameSettingsItemizedCategoryInput => input !== null,
    );

  if (providedInputs.length > 0) {
    return providedInputs;
  }

  const fallbackLabel = normalizeOptionalText(
    "inputLabel" in category && typeof category.inputLabel === "string"
      ? category.inputLabel
      : null,
  );

  return [
    {
      key: normalizeItemizedInputKey(
        DEFAULT_SINGLE_INPUT_KEY,
        `value_${index + 1}`,
      ),
      label: fallbackLabel ?? DEFAULT_SINGLE_INPUT_LABEL,
      defaultValue: 0,
    },
  ];
}

function normalizeFormula(
  category: GameSettingsItemizedCategoryDraft,
  inputs: GameSettingsItemizedCategoryInput[],
  fallbackValue: number | null,
) {
  const normalizedFormula = normalizeOptionalText(category.formula);

  if (normalizedFormula) {
    return normalizedFormula;
  }

  if (fallbackValue !== null) {
    return `${inputs[0]?.key ?? DEFAULT_SINGLE_INPUT_KEY} * ${fallbackValue}`;
  }

  return inputs.length === 1
    ? inputs[0]!.key
    : inputs.map((input) => input.key).join(" + ");
}

function normalizeInputMode(
  category: GameSettingsItemizedCategoryDraft,
  inputs: GameSettingsItemizedCategoryInput[],
) {
  const explicitMode = category.inputMode;

  if (explicitMode === "single" || explicitMode === "multi") {
    return explicitMode;
  }

  return inputs.length > 1 ? "multi" : "single";
}

function normalizeCategory(
  category: GameSettingsItemizedCategoryDraft,
  index: number,
): GameSettingsItemizedCategory | null {
  const name = (category.name ?? "").trim();

  if (!name) {
    return null;
  }

  const id = (category.id ?? `${index + 1}`).trim() || `${index + 1}`;
  const sortOrder = asFiniteInteger(category.sortOrder) ?? index;
  const legacyValue =
    "value" in category ? asFiniteInteger(category.value) : null;

  if (
    legacyValue !== null &&
    !normalizeOptionalText(category.formula) &&
    !category.inputs?.length
  ) {
    return buildLegacyItemizedCategory({
      id,
      name,
      sortOrder,
      value: legacyValue,
    });
  }

  const inputs = normalizeInputs(category, index);
  const inputKeys = new Set<string>();

  for (const input of inputs) {
    if (inputKeys.has(input.key)) {
      throw new Error(`Duplicate input key "${input.key}" in ${name}`);
    }

    inputKeys.add(input.key);
  }

  const inputMode = normalizeInputMode(category, inputs);

  if (inputMode === "single" && inputs.length !== 1) {
    throw new Error(`${name} must use exactly one input`);
  }

  if (inputMode === "multi" && inputs.length < 2) {
    throw new Error(`${name} needs at least two inputs for advanced scoring`);
  }

  const formula = normalizeFormula(category, inputs, legacyValue);
  validateSafeMathExpression({
    expression: formula,
    allowedIdentifiers: inputs.map((input) => input.key),
  });

  return {
    id,
    name,
    optional: Boolean(category.optional),
    sortOrder,
    inputMode,
    inputs,
    formula,
    helpText: normalizeOptionalText(category.helpText),
  };
}

function ensureUniqueCategoryIds(categories: GameSettingsItemizedCategory[]) {
  const seen = new Set<string>();

  for (const category of categories) {
    if (seen.has(category.id)) {
      throw new Error(`Duplicate category key "${category.id}"`);
    }

    seen.add(category.id);
  }
}

function normalizeScoringType(input: GameSettingsV2Input): GameScoringType {
  if (
    input.scoringType === "points" ||
    input.scoringType === "winner_selection" ||
    input.scoringType === "elimination"
  ) {
    return input.scoringType;
  }

  if (input.roundConfig?.requiresRoundWinner) {
    return "winner_selection";
  }

  if (
    input.scoringType === "ranked_placement_only" ||
    input.gameEndTrigger === "player_eliminated"
  ) {
    return "elimination";
  }

  return "points";
}

export function validateGameSettingsV2(
  input: GameSettingsV2Input,
): GameSettingsV2 {
  const settings: GameSettingsV2 = {
    version: "v2",
    gameEndTrigger:
      input.gameEndTrigger ?? DEFAULT_GAME_SETTINGS_V2.gameEndTrigger,
    scoringType: normalizeScoringType(input),
    winMetric: input.winMetric ?? DEFAULT_GAME_SETTINGS_V2.winMetric,
    initialPlayerScore:
      asFiniteInteger(input.initialPlayerScore) ??
      DEFAULT_GAME_SETTINGS_V2.initialPlayerScore,
    roundConfig: {
      enabled: Boolean(input.roundConfig?.enabled),
      targetRounds: normalizePositiveInteger(input.roundConfig?.targetRounds),
    },
    thresholdConfig: {
      value: normalizePositiveInteger(input.thresholdConfig?.value),
      direction: input.thresholdConfig?.direction ?? null,
    },
    tiePolicy: {
      allowTies: input.tiePolicy?.allowTies ?? true,
      resolution: input.tiePolicy?.resolution ?? "allow",
    },
    playerConfig: {
      minPlayers: normalizePositiveInteger(input.playerConfig?.minPlayers),
      maxPlayers: normalizePositiveInteger(input.playerConfig?.maxPlayers),
      allPlayersAreManagers: Boolean(input.playerConfig?.allPlayersAreManagers),
    },
    itemizedCategories: (input.itemizedCategories ?? [])
      .map((category, index) => normalizeCategory(category, index))
      .filter(
        (category): category is GameSettingsItemizedCategory =>
          category !== null,
      )
      .sort((left, right) => left.sortOrder - right.sortOrder),
    resourceConfig: {},
    objectiveConfig: {},
  };

  ensureUniqueCategoryIds(settings.itemizedCategories);

  if (settings.gameEndTrigger === "resource_pool_depleted") {
    throw new Error("Resource pool depleted games are not supported yet");
  }

  if (
    settings.playerConfig.minPlayers !== null &&
    settings.playerConfig.maxPlayers !== null &&
    settings.playerConfig.minPlayers > settings.playerConfig.maxPlayers
  ) {
    throw new Error("Minimum players cannot be greater than maximum players");
  }

  if (settings.winMetric === "objective_fulfilled") {
    throw new Error("Objective fulfilled games are not supported yet");
  }

  if (
    settings.gameEndTrigger === "player_eliminated" &&
    settings.scoringType !== "elimination"
  ) {
    throw new Error("Player-eliminated endings require Elimination scoring");
  }

  if (
    settings.gameEndTrigger === "rounds_exhausted" &&
    settings.roundConfig.targetRounds === null
  ) {
    throw new Error("Choose how many rounds the game should target");
  }

  if (settings.gameEndTrigger === "points_threshold_reached") {
    if (settings.thresholdConfig.value === null) {
      throw new Error("Choose a score threshold");
    }

    if (!settings.thresholdConfig.direction) {
      throw new Error("Choose how the score threshold should work");
    }
  } else {
    settings.thresholdConfig = {
      value: null,
      direction: null,
    };
  }

  if (settings.scoringType !== "points") {
    settings.itemizedCategories = [];
    settings.initialPlayerScore = 0;
  }

  if (settings.scoringType === "points") {
    if (
      settings.winMetric !== "highest_score" &&
      settings.winMetric !== "lowest_score"
    ) {
      throw new Error("Score points must use highest or lowest score");
    }
  }

  if (!settings.roundConfig.enabled && settings.scoringType === "points") {
    settings.gameEndTrigger = "manual_finish";
    settings.roundConfig.targetRounds = null;
    settings.thresholdConfig = { value: null, direction: null };
  }

  if (settings.scoringType === "winner_selection") {
    settings.winMetric = "highest_score";
  }

  if (settings.scoringType === "elimination") {
    settings.winMetric = settings.roundConfig.enabled
      ? "highest_score"
      : "last_man_standing";

    if (!settings.roundConfig.enabled) {
      settings.gameEndTrigger = "player_eliminated";
      settings.roundConfig.targetRounds = null;
      settings.thresholdConfig = { value: null, direction: null };
    }

    if (!settings.roundConfig.enabled) {
      settings.tiePolicy = {
        allowTies: false,
        resolution: "manual_placement_override",
      };
    }
  }

  if (
    settings.scoringType === "winner_selection" &&
    !settings.roundConfig.enabled
  ) {
    settings.gameEndTrigger = "manual_finish";
    settings.roundConfig.targetRounds = null;
    settings.thresholdConfig = { value: null, direction: null };
    settings.tiePolicy = {
      allowTies: false,
      resolution: "manual_winner_override",
    };
  }

  if (
    !settings.roundConfig.enabled &&
    settings.gameEndTrigger === "rounds_exhausted"
  ) {
    throw new Error("Fixed rounds require Rounds gameplay");
  }

  if (settings.gameEndTrigger === "rounds_exhausted") {
    settings.roundConfig.enabled = true;
  } else {
    settings.roundConfig.targetRounds = null;
  }

  if (settings.tiePolicy.allowTies) {
    settings.tiePolicy.resolution = "allow";
  } else if (
    settings.tiePolicy.resolution !== "manual_winner_override" &&
    settings.tiePolicy.resolution !== "manual_placement_override"
  ) {
    settings.tiePolicy.resolution =
      settings.scoringType === "elimination" && !settings.roundConfig.enabled
        ? "manual_placement_override"
        : "manual_winner_override";
  }

  return settings;
}

export function parseGameSettingsV2(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = JSON.parse(value) as GameSettingsV2Input;
  return validateGameSettingsV2(parsed);
}

export function serializeGameSettingsV2(settings: GameSettingsV2) {
  return JSON.stringify(settings);
}

export function isV2GameVersion(version: GameVersion) {
  return version === "v2";
}

export function projectV2SettingsToLegacy(input: GameSettingsV2): {
  scoringMode: GameScoringMode;
  endingMode: "none" | "round_count" | "score_threshold";
  trackRounds: boolean;
  targetRounds: number | null;
  scoreThreshold: number | null;
  scoreThresholdDirection: GameScoreThresholdDirection | null;
} {
  const scoringMode: GameScoringMode =
    input.scoringType === "elimination" && !input.roundConfig.enabled
      ? "no_score"
      : input.winMetric === "lowest_score"
        ? "lowest_wins"
        : "highest_wins";

  const endingMode =
    input.gameEndTrigger === "rounds_exhausted"
      ? "round_count"
      : input.gameEndTrigger === "points_threshold_reached"
        ? "score_threshold"
        : "none";

  return {
    scoringMode,
    endingMode,
    trackRounds: input.roundConfig.enabled,
    targetRounds:
      input.gameEndTrigger === "rounds_exhausted"
        ? input.roundConfig.targetRounds
        : null,
    scoreThreshold:
      input.gameEndTrigger === "points_threshold_reached"
        ? input.thresholdConfig.value
        : null,
    scoreThresholdDirection:
      input.gameEndTrigger === "points_threshold_reached"
        ? input.thresholdConfig.direction
        : null,
  };
}

export function getV2InitialPlayerScore(settings: GameSettingsV2) {
  return settings.scoringType === "points" ? settings.initialPlayerScore : 0;
}

export function isGameSettingsV2EndGameTally(settings: GameSettingsV2) {
  return (
    settings.scoringType === "points" &&
    !settings.roundConfig.enabled &&
    settings.itemizedCategories.length > 0
  );
}

export function supportsGameSettingsV2ItemizedScoring(
  settings: GameSettingsV2,
) {
  return settings.scoringType === "points";
}

export function usesGameSettingsV2ItemizedScoring(settings: GameSettingsV2) {
  return (
    supportsGameSettingsV2ItemizedScoring(settings) &&
    settings.itemizedCategories.length > 0
  );
}

export function isGameSettingsV2Elimination(settings: GameSettingsV2) {
  return settings.scoringType === "elimination";
}

export function usesWinnerSelection(settings: GameSettingsV2) {
  return settings.scoringType === "winner_selection";
}

export function getCreateGameSettingsTemplate(
  settings: Pick<
    GameSettingsV2,
    "gameEndTrigger" | "scoringType" | "winMetric" | "roundConfig"
  >,
): CreateGameSettingsTemplate {
  if (settings.scoringType === "elimination") {
    return "elimination";
  }

  if (settings.scoringType === "winner_selection") {
    return "choose_winner";
  }

  return "point_scoring";
}

export function buildCreateGameSettingsFromTemplate(input: {
  template: CreateGameSettingsTemplate;
  roundsEnabled?: boolean;
  endConditionMode?: "manual" | "fixed_rounds" | "score_threshold";
  winMetric?: "highest_score" | "lowest_score";
  targetRounds?: number | null;
  thresholdValue?: number | null;
  allowTies?: boolean;
  initialPlayerScore?: number | null;
  playerConfig?: Partial<GameSettingsV2["playerConfig"]> | null;
  itemizedCategories?: GameSettingsItemizedCategoryDraft[] | null;
}) {
  const winMetric = input.winMetric ?? "highest_score";
  const allowTies = input.allowTies ?? true;
  const initialPlayerScore = asFiniteInteger(input.initialPlayerScore) ?? 0;
  const itemizedCategories = input.itemizedCategories ?? [];

  const roundsEnabled = Boolean(input.roundsEnabled);
  const endConditionMode = input.endConditionMode ?? "manual";
  const scoringType: GameScoringType =
    input.template === "choose_winner"
      ? "winner_selection"
      : input.template === "elimination"
        ? "elimination"
        : "points";
  const gameEndTrigger: GameEndTrigger =
    input.template === "elimination" && !roundsEnabled
      ? "player_eliminated"
      : endConditionMode === "fixed_rounds"
        ? "rounds_exhausted"
        : endConditionMode === "score_threshold"
          ? "points_threshold_reached"
          : "manual_finish";

  return validateGameSettingsV2({
    gameEndTrigger,
    scoringType,
    winMetric:
      scoringType === "elimination"
        ? roundsEnabled
          ? "highest_score"
          : "last_man_standing"
        : scoringType === "winner_selection"
          ? "highest_score"
          : winMetric,
    initialPlayerScore: scoringType === "points" ? initialPlayerScore : 0,
    roundConfig: {
      enabled: roundsEnabled,
      targetRounds:
        endConditionMode === "fixed_rounds"
          ? normalizePositiveInteger(input.targetRounds)
          : null,
    },
    thresholdConfig: {
      value:
        endConditionMode === "score_threshold"
          ? normalizePositiveInteger(input.thresholdValue)
          : null,
      direction:
        endConditionMode === "score_threshold"
          ? scoringType === "points" && winMetric === "lowest_score"
            ? "at_most"
            : "at_least"
          : null,
    },
    tiePolicy: {
      allowTies,
      resolution: allowTies ? "allow" : "manual_winner_override",
    },
    playerConfig: input.playerConfig
      ? {
          minPlayers: input.playerConfig.minPlayers ?? null,
          maxPlayers: input.playerConfig.maxPlayers ?? null,
          allPlayersAreManagers: Boolean(
            input.playerConfig.allPlayersAreManagers,
          ),
        }
      : undefined,
    itemizedCategories: scoringType === "points" ? itemizedCategories : [],
  });
}

export function getCreateGameSettingsTitleSeed(
  input: TitleDefaultsSeedInput | null | undefined,
): CreateGameSettingsTitleSeed {
  if (input?.defaultSettingsVersion === "v2") {
    const parsed = parseGameSettingsV2(input.defaultSettingsJson);

    if (parsed) {
      return {
        source: "v2",
        settings: parsed,
        sectionsWithDefaults: {
          gameType: true,
          gameplay: true,
          winCondition: true,
          endCondition: parsed.roundConfig.enabled,
          tieBehavior: parsed.gameEndTrigger !== "player_eliminated",
        },
      };
    }
  }

  return {
    source: "none",
    settings: DEFAULT_CREATE_GAME_SETTINGS_V2,
    sectionsWithDefaults: {
      gameType: false,
      gameplay: false,
      winCondition: false,
      endCondition: false,
      tieBehavior: false,
    },
  };
}

export function isCreateGameSettingsSectionAtTitleDefault(
  current: GameSettingsV2,
  titleDefaults: GameSettingsV2,
  section: CreateGameSettingsSection,
) {
  switch (section) {
    case "gameType":
      return current.scoringType === titleDefaults.scoringType;
    case "gameplay":
      return current.roundConfig.enabled === titleDefaults.roundConfig.enabled;
    case "winCondition":
      return current.winMetric === titleDefaults.winMetric;
    case "endCondition":
      return (
        current.gameEndTrigger === titleDefaults.gameEndTrigger &&
        current.roundConfig.targetRounds ===
          titleDefaults.roundConfig.targetRounds &&
        current.thresholdConfig.value === titleDefaults.thresholdConfig.value &&
        current.thresholdConfig.direction ===
          titleDefaults.thresholdConfig.direction
      );
    case "tieBehavior":
      return (
        current.tiePolicy.allowTies === titleDefaults.tiePolicy.allowTies &&
        current.tiePolicy.resolution === titleDefaults.tiePolicy.resolution
      );
  }
}

export function getCreateGameRankPointsLabel(
  settings: Pick<GameSettingsV2, "scoringType" | "roundConfig">,
) {
  return settings.scoringType === "elimination" && !settings.roundConfig.enabled
    ? "Top 3 will earn Rank points"
    : "Winner will earn Rank points";
}
