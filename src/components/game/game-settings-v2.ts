"use client";

import {
  normalizeItemizedCategoryKey,
  evaluateItemizedCategoryFormula,
  normalizeItemizedInputKey,
  validateSafeMathExpression,
} from "@/lib/game/itemized-scoring";
import {
  buildCreateGameSettingsFromTemplate,
  DEFAULT_CREATE_GAME_SETTINGS_V2,
  getCreateGameRankPointsLabel,
  getCreateGameSettingsTemplate,
  isCreateGameSettingsSectionAtTitleDefault,
  type CreateGameSettingsSection,
  type CreateGameSettingsTemplate,
  type CreateGameSettingsTitleSeed,
  type GameSettingsItemizedCategory,
  type GameSettingsV2,
} from "@/lib/game/v2";

export type EditableItemizedCategoryInput = {
  key: string;
  label: string;
  defaultValue: string;
};

export type EditableItemizedCategory = {
  id: string;
  categoryKey: string;
  name: string;
  optional: boolean;
  inputMode: "single" | "multi";
  formula: string;
  helpText: string;
  inputs: EditableItemizedCategoryInput[];
};

export type EditableGameSettingsV2 = {
  template: CreateGameSettingsTemplate | null;
  gameplayMode: "rounds" | "no_rounds" | null;
  winMetric: "highest_score" | "lowest_score" | null;
  endConditionMode: "manual" | "fixed_rounds" | "score_threshold" | null;
  targetRounds: string;
  thresholdValue: string;
  initialPlayerScore: string;
  allowTies: boolean;
  minPlayers: string;
  maxPlayers: string;
  allPlayersAreManagers: boolean;
  itemizedCategories: EditableItemizedCategory[];
};

export type SectionOpenState = Record<CreateGameSettingsSection, boolean> & {
  initialScore: boolean;
};
export type SectionTouchedState = Record<CreateGameSettingsSection, boolean> & {
  initialScore: boolean;
};

export const GAME_SCORING_OPTIONS: Array<{
  value: CreateGameSettingsTemplate;
  title: string;
  description: string;
}> = [
  {
    value: "point_scoring",
    title: "Score points",
    description: "Add or subtract points as the game is played.",
  },
  {
    value: "choose_winner",
    title: "Choose the winner",
    description: "Pick who wins instead of keeping score.",
  },
  {
    value: "elimination",
    title: "Elimination",
    description: "Knock players out one at a time until one remains.",
  },
];

export function parsePositiveInteger(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const rounded = Math.trunc(parsed);
  return rounded > 0 ? rounded : null;
}

export function parseInteger(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.trunc(parsed);
}

function buildEditableCategoryId() {
  return `category-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEditableCategory(
  mode: "single" | "multi",
): EditableItemizedCategory {
  return {
    id: buildEditableCategoryId(),
    categoryKey: "",
    name: "",
    optional: false,
    inputMode: mode,
    formula:
      mode === "single"
        ? "if(count >= 10, count * 25, count * 20)"
        : "if(penalty > 0, count * points_each - penalty, count * points_each)",
    helpText: "",
    inputs:
      mode === "single"
        ? [{ key: "count", label: "Count", defaultValue: "0" }]
        : [
            { key: "count", label: "Count", defaultValue: "0" },
            { key: "points_each", label: "Points each", defaultValue: "20" },
            { key: "penalty", label: "Penalty", defaultValue: "0" },
          ],
  };
}

export function createEditableSettings(
  settings: GameSettingsV2 | null,
): EditableGameSettingsV2 {
  if (!settings) {
    return {
      template: null,
      gameplayMode: null,
      winMetric: null,
      endConditionMode: null,
      targetRounds: "6",
      thresholdValue: "100",
      initialPlayerScore: "0",
      allowTies: true,
      minPlayers: "",
      maxPlayers: "",
      allPlayersAreManagers: false,
      itemizedCategories: [],
    };
  }

  const template = getCreateGameSettingsTemplate(settings);

  return {
    template,
    gameplayMode: settings.roundConfig.enabled ? "rounds" : "no_rounds",
    winMetric:
      settings.winMetric === "lowest_score" ? "lowest_score" : "highest_score",
    endConditionMode: settings.roundConfig.enabled
      ? settings.gameEndTrigger === "points_threshold_reached"
        ? "score_threshold"
        : settings.gameEndTrigger === "rounds_exhausted"
          ? "fixed_rounds"
          : "manual"
      : null,
    targetRounds: settings.roundConfig.targetRounds?.toString() ?? "6",
    thresholdValue: settings.thresholdConfig.value?.toString() ?? "100",
    initialPlayerScore: settings.initialPlayerScore.toString(),
    allowTies: settings.tiePolicy.allowTies,
    minPlayers: settings.playerConfig.minPlayers?.toString() ?? "",
    maxPlayers: settings.playerConfig.maxPlayers?.toString() ?? "",
    allPlayersAreManagers: settings.playerConfig.allPlayersAreManagers,
    itemizedCategories: settings.itemizedCategories.map((category) => ({
      id: buildEditableCategoryId(),
      categoryKey: category.id,
      name: category.name,
      optional: category.optional,
      inputMode: category.inputMode,
      formula: category.formula,
      helpText: category.helpText ?? "",
      inputs: category.inputs.map((input) => ({
        key: input.key,
        label: input.label,
        defaultValue: input.defaultValue.toString(),
      })),
    })),
  };
}

export function buildValidatedSettings(
  draft: EditableGameSettingsV2,
): GameSettingsV2 {
  if (!draft.template) {
    throw new Error("Choose a game scoring style");
  }

  if (!draft.gameplayMode) {
    throw new Error("Choose Rounds or No rounds");
  }

  if (draft.template === "point_scoring" && !draft.winMetric) {
    throw new Error("Choose who wins the game");
  }

  if (
    usesNumericScoring(draft.template) &&
    parseInteger(draft.initialPlayerScore) === null
  ) {
    throw new Error("Choose a starting score");
  }

  if (draft.gameplayMode === "rounds" && !draft.endConditionMode) {
    throw new Error("Choose how the game should end");
  }

  return buildCreateGameSettingsFromTemplate({
    template: draft.template,
    roundsEnabled: draft.gameplayMode === "rounds",
    endConditionMode:
      draft.gameplayMode === "rounds"
        ? (draft.endConditionMode ?? "manual")
        : "manual",
    winMetric: draft.winMetric ?? undefined,
    targetRounds: parsePositiveInteger(draft.targetRounds),
    thresholdValue: parsePositiveInteger(draft.thresholdValue),
    initialPlayerScore: parseInteger(draft.initialPlayerScore),
    allowTies: draft.allowTies,
    playerConfig: {
      minPlayers: parsePositiveInteger(draft.minPlayers),
      maxPlayers: parsePositiveInteger(draft.maxPlayers),
      allPlayersAreManagers: draft.allPlayersAreManagers,
    },
    itemizedCategories: draft.itemizedCategories.map((category) => ({
      id: normalizeItemizedCategoryKey(
        category.categoryKey || category.name,
        `category_${category.name || "item"}`,
      ),
      name: category.name,
      optional: category.optional,
      inputMode: category.inputMode,
      formula: category.formula,
      helpText: category.helpText,
      inputs: category.inputs.map((input, index) => ({
        key: normalizeItemizedInputKey(
          input.key || input.label,
          `value_${index + 1}`,
        ),
        label: input.label,
        defaultValue: parseInteger(input.defaultValue) ?? 0,
      })),
    })),
  });
}

export function buildCurrentSettings(draft: EditableGameSettingsV2) {
  try {
    return buildValidatedSettings(draft);
  } catch {
    if (!draft.template) {
      return DEFAULT_CREATE_GAME_SETTINGS_V2;
    }

    const targetRounds = parsePositiveInteger(draft.targetRounds);
    const thresholdValue = parsePositiveInteger(draft.thresholdValue);
    const previewEndConditionMode =
      draft.gameplayMode !== "rounds" ||
      (draft.endConditionMode === "fixed_rounds" && targetRounds === null) ||
      (draft.endConditionMode === "score_threshold" && thresholdValue === null)
        ? "manual"
        : (draft.endConditionMode ?? "manual");

    const previewInput: Parameters<
      typeof buildCreateGameSettingsFromTemplate
    >[0] = {
      template: draft.template,
      roundsEnabled: draft.gameplayMode === "rounds",
      endConditionMode: previewEndConditionMode,
      winMetric:
        draft.winMetric === "lowest_score" ? "lowest_score" : "highest_score",
      targetRounds,
      thresholdValue,
      initialPlayerScore: parseInteger(draft.initialPlayerScore) ?? 0,
      allowTies: draft.allowTies,
      playerConfig: {
        minPlayers: parsePositiveInteger(draft.minPlayers),
        maxPlayers: parsePositiveInteger(draft.maxPlayers),
        allPlayersAreManagers: draft.allPlayersAreManagers,
      },
      itemizedCategories: draft.itemizedCategories
        .filter((category) => category.name.trim().length > 0)
        .map((category) => ({
          id: normalizeItemizedCategoryKey(
            category.categoryKey || category.name,
            `category_${category.name || "item"}`,
          ),
          name: category.name,
          optional: category.optional,
          inputMode: category.inputMode,
          formula: category.formula,
          helpText: category.helpText,
          inputs: category.inputs.map((input, index) => ({
            key: normalizeItemizedInputKey(
              input.key || input.label,
              `value_${index + 1}`,
            ),
            label: input.label,
            defaultValue: parseInteger(input.defaultValue) ?? 0,
          })),
        })),
    };

    try {
      return buildCreateGameSettingsFromTemplate(previewInput);
    } catch {
      try {
        return buildCreateGameSettingsFromTemplate({
          ...previewInput,
          itemizedCategories: [],
        });
      } catch {
        return DEFAULT_CREATE_GAME_SETTINGS_V2;
      }
    }
  }
}

export function getTemplateLabel(template: CreateGameSettingsTemplate | null) {
  if (!template) {
    return "Choose scoring";
  }

  return (
    GAME_SCORING_OPTIONS.find((option) => option.value === template)?.title ??
    "Game Scoring"
  );
}

export function getWinConditionSummary(draft: EditableGameSettingsV2) {
  if (!draft.template) {
    return "Choose who wins";
  }

  if (draft.template === "elimination") {
    return draft.gameplayMode === "rounds"
      ? "Most round wins"
      : "Last player standing wins";
  }

  if (draft.template === "choose_winner") {
    return draft.gameplayMode === "rounds"
      ? "Most round wins"
      : "Selected player wins";
  }

  if (!draft.winMetric) {
    return "Choose who wins";
  }

  return draft.winMetric === "lowest_score"
    ? "Lowest score wins"
    : "Highest score wins";
}

export function getEndConditionSummary(draft: EditableGameSettingsV2) {
  if (!draft.template || !draft.gameplayMode) {
    return "Choose how the game ends";
  }

  if (draft.gameplayMode === "no_rounds") {
    return "Single play-through";
  }

  if (!draft.endConditionMode) {
    return "Choose how the game ends";
  }

  if (draft.endConditionMode === "score_threshold") {
    const threshold = draft.thresholdValue.trim() || "target";
    return draft.winMetric === "lowest_score"
      ? `Ends when a score drops to ${threshold}`
      : `Ends when a score reaches ${threshold}`;
  }

  if (draft.endConditionMode === "manual") {
    return draft.gameplayMode === "rounds" ? "Free play" : "Free play";
  }

  const rounds = draft.targetRounds.trim() || "round target";
  return `Ends after ${rounds} round${rounds === "1" ? "" : "s"}`;
}

export function usesNumericScoring(
  template: CreateGameSettingsTemplate | null,
) {
  return template === "point_scoring";
}

export function getGameplaySummary(draft: EditableGameSettingsV2) {
  if (!draft.gameplayMode) {
    return "Choose Rounds or No rounds";
  }

  return draft.gameplayMode === "rounds" ? "Rounds" : "No rounds";
}

export function getInitialScoreDescription() {
  return "All players start at this score.";
}

export function getInitialScoreSummary(draft: EditableGameSettingsV2) {
  const initialScore = parseInteger(draft.initialPlayerScore);

  if (initialScore === null) {
    return "Choose starting score";
  }

  return `Starts at ${initialScore}`;
}

export function createSectionOpenState(
  seed: CreateGameSettingsTitleSeed,
): SectionOpenState {
  return {
    gameType: !seed.sectionsWithDefaults.gameType,
    gameplay: !seed.sectionsWithDefaults.gameplay,
    winCondition: !seed.sectionsWithDefaults.winCondition,
    endCondition: !seed.sectionsWithDefaults.endCondition,
    tieBehavior: false,
    initialScore: !isInitialScoreDefault(seed),
  };
}

export function createSectionTouchedState(
  resolved = false,
): SectionTouchedState {
  return {
    gameType: resolved,
    gameplay: resolved,
    winCondition: resolved,
    endCondition: resolved,
    tieBehavior: resolved,
    initialScore: resolved,
  };
}

export function isInitialScoreDefault(seed: CreateGameSettingsTitleSeed) {
  return (
    seed.source === "v2" &&
    usesNumericScoring(getCreateGameSettingsTemplate(seed.settings))
  );
}

export function isInitialScoreUsingTitleDefault(input: {
  seed: CreateGameSettingsTitleSeed;
  currentSettings: GameSettingsV2;
}) {
  return (
    isInitialScoreDefault(input.seed) &&
    input.currentSettings.initialPlayerScore ===
      input.seed.settings.initialPlayerScore
  );
}

export function isInitialScoreResolved(input: {
  seed: CreateGameSettingsTitleSeed;
  currentSettings: GameSettingsV2;
  settingsDraft: EditableGameSettingsV2;
  touched: SectionTouchedState;
}) {
  if (
    isInitialScoreUsingTitleDefault({
      seed: input.seed,
      currentSettings: input.currentSettings,
    })
  ) {
    return true;
  }

  if (!input.settingsDraft.template) {
    return false;
  }

  if (!usesNumericScoring(input.settingsDraft.template)) {
    return true;
  }

  return (
    input.touched.initialScore &&
    parseInteger(input.settingsDraft.initialPlayerScore) !== null
  );
}

export function getTitleDefaultsLabel(
  source: CreateGameSettingsTitleSeed["source"],
) {
  if (source === "v2") {
    return "Has defaults";
  }

  return "No community defaults";
}

export function areAllSettingsAtTitleDefaults(input: {
  seed: CreateGameSettingsTitleSeed;
  currentSettings: GameSettingsV2;
}) {
  if (input.seed.source !== "v2") {
    return false;
  }

  return (
    isSectionUsingTitleDefault({
      section: "gameType",
      seed: input.seed,
      currentSettings: input.currentSettings,
    }) &&
    isSectionUsingTitleDefault({
      section: "gameplay",
      seed: input.seed,
      currentSettings: input.currentSettings,
    }) &&
    isSectionUsingTitleDefault({
      section: "winCondition",
      seed: input.seed,
      currentSettings: input.currentSettings,
    }) &&
    (!input.currentSettings.roundConfig.enabled ||
      isSectionUsingTitleDefault({
        section: "endCondition",
        seed: input.seed,
        currentSettings: input.currentSettings,
      })) &&
    isInitialScoreUsingTitleDefault({
      seed: input.seed,
      currentSettings: input.currentSettings,
    })
  );
}

export function isDefaultTemplateOption(
  seed: CreateGameSettingsTitleSeed,
  template: CreateGameSettingsTemplate | null,
) {
  return (
    template !== null &&
    seed.source === "v2" &&
    getCreateGameSettingsTemplate(seed.settings) === template
  );
}

export function isDefaultWinMetricOption(
  seed: CreateGameSettingsTitleSeed,
  winMetric: "highest_score" | "lowest_score" | null,
) {
  return (
    winMetric !== null &&
    seed.source === "v2" &&
    seed.settings.winMetric === winMetric
  );
}

export function isDefaultRoundsValue(seed: CreateGameSettingsTitleSeed) {
  return (
    seed.source === "v2" && seed.settings.roundConfig.targetRounds !== null
  );
}

export function isDefaultThresholdValue(seed: CreateGameSettingsTitleSeed) {
  return seed.source === "v2" && seed.settings.thresholdConfig.value !== null;
}

export function isSectionUsingTitleDefault(input: {
  section: CreateGameSettingsSection;
  seed: CreateGameSettingsTitleSeed;
  currentSettings: GameSettingsV2;
}) {
  return (
    input.seed.sectionsWithDefaults[input.section] &&
    isCreateGameSettingsSectionAtTitleDefault(
      input.currentSettings,
      input.seed.settings,
      input.section,
    )
  );
}

export function isSectionResolved(input: {
  section: CreateGameSettingsSection;
  seed: CreateGameSettingsTitleSeed;
  currentSettings: GameSettingsV2;
  settingsDraft: EditableGameSettingsV2;
  touched: SectionTouchedState;
}) {
  if (
    isSectionUsingTitleDefault({
      section: input.section,
      seed: input.seed,
      currentSettings: input.currentSettings,
    })
  ) {
    return true;
  }

  switch (input.section) {
    case "gameType":
      return input.touched.gameType;
    case "gameplay":
      return Boolean(
        input.settingsDraft.template &&
        input.settingsDraft.gameplayMode &&
        input.touched.gameplay,
      );
    case "winCondition":
      if (!input.settingsDraft.template) {
        return false;
      }

      if (input.settingsDraft.template !== "point_scoring") {
        return input.touched.gameType;
      }

      return Boolean(
        input.settingsDraft.winMetric && input.touched.winCondition,
      );
    case "endCondition":
      if (!input.settingsDraft.template || !input.settingsDraft.gameplayMode) {
        return false;
      }

      if (input.settingsDraft.gameplayMode === "no_rounds") {
        return true;
      }

      if (!input.settingsDraft.endConditionMode) {
        return false;
      }

      if (input.settingsDraft.endConditionMode === "score_threshold") {
        return (
          input.touched.endCondition &&
          parsePositiveInteger(input.settingsDraft.thresholdValue) !== null
        );
      }

      if (input.settingsDraft.endConditionMode === "fixed_rounds") {
        return (
          input.touched.endCondition &&
          parsePositiveInteger(input.settingsDraft.targetRounds) !== null
        );
      }

      return input.touched.endCondition;
    case "tieBehavior":
      return true;
  }
}

export function getSectionStatusLabel(input: {
  section: CreateGameSettingsSection;
  seed: CreateGameSettingsTitleSeed;
  currentSettings: GameSettingsV2;
  settingsDraft: EditableGameSettingsV2;
  touched: SectionTouchedState;
}) {
  if (
    isSectionUsingTitleDefault({
      section: input.section,
      seed: input.seed,
      currentSettings: input.currentSettings,
    })
  ) {
    return "Title default";
  }

  if (
    isSectionResolved({
      section: input.section,
      seed: input.seed,
      currentSettings: input.currentSettings,
      settingsDraft: input.settingsDraft,
      touched: input.touched,
    })
  ) {
    return "Selected";
  }

  return null;
}

export function areAllSettingsResolved(input: {
  seed: CreateGameSettingsTitleSeed;
  currentSettings: GameSettingsV2;
  settingsDraft: EditableGameSettingsV2;
  touched: SectionTouchedState;
}) {
  return (
    isSectionResolved({
      section: "gameType",
      seed: input.seed,
      currentSettings: input.currentSettings,
      settingsDraft: input.settingsDraft,
      touched: input.touched,
    }) &&
    isSectionResolved({
      section: "gameplay",
      seed: input.seed,
      currentSettings: input.currentSettings,
      settingsDraft: input.settingsDraft,
      touched: input.touched,
    }) &&
    isSectionResolved({
      section: "winCondition",
      seed: input.seed,
      currentSettings: input.currentSettings,
      settingsDraft: input.settingsDraft,
      touched: input.touched,
    }) &&
    isSectionResolved({
      section: "endCondition",
      seed: input.seed,
      currentSettings: input.currentSettings,
      settingsDraft: input.settingsDraft,
      touched: input.touched,
    }) &&
    isSectionResolved({
      section: "tieBehavior",
      seed: input.seed,
      currentSettings: input.currentSettings,
      settingsDraft: input.settingsDraft,
      touched: input.touched,
    }) &&
    isInitialScoreResolved({
      seed: input.seed,
      currentSettings: input.currentSettings,
      settingsDraft: input.settingsDraft,
      touched: input.touched,
    })
  );
}

export function getCategoryPreview(category: EditableItemizedCategory) {
  try {
    const normalizedCategory: GameSettingsItemizedCategory = {
      id: category.id,
      name: category.name.trim() || "Category",
      optional: category.optional,
      sortOrder: 0,
      inputMode: category.inputMode,
      formula: category.formula,
      helpText: category.helpText.trim() || null,
      inputs: category.inputs.map((input, index) => ({
        key: normalizeItemizedInputKey(
          input.key || input.label,
          `value_${index + 1}`,
        ),
        label: input.label.trim(),
        defaultValue: parseInteger(input.defaultValue) ?? 0,
      })),
    };

    validateSafeMathExpression({
      expression: normalizedCategory.formula,
      allowedIdentifiers: normalizedCategory.inputs.map((input) => input.key),
    });
    const preview = evaluateItemizedCategoryFormula({
      category: normalizedCategory,
      values: Object.fromEntries(
        normalizedCategory.inputs.map((input) => [
          input.key,
          input.defaultValue,
        ]),
      ),
    });

    return `Preview: ${preview.normalizedScore} points`;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid formula";
  }
}

export function areEditableSettingsEqual(
  left: EditableGameSettingsV2,
  right: EditableGameSettingsV2,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function getRankPointsLabel(draft: EditableGameSettingsV2) {
  return getCreateGameRankPointsLabel(buildCurrentSettings(draft));
}
