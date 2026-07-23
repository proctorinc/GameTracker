import { createId } from "@paralleldrive/cuid2";
import type { GameSettingsItemizedCategory } from "@/lib/game/v2";
import { validateGameSettingsV2, type GameSettingsV2 } from "@/lib/game/v2";
import {
  ITEMIZED_SCORE_METADATA_PREFIX,
  parsePersistedItemizedValues,
  type ItemizedScoreEntryValues,
} from "@/lib/game/itemized-scoring";

export const LOST_CITIES_NORMALIZED_TITLE = "lost cities";
export const LOST_CITIES_FORMULA =
  "((card_sum - 20) * (wagers + 1)) + bonus_if_ge(card_count, 8, 20)";

const LOST_CITIES_CATEGORY_NAMES = [
  "Yellow Expedition",
  "Blue Expedition",
  "White Expedition",
  "Green Expedition",
  "Red Expedition",
  "Purple Expedition",
] as const;
const CATEGORY_KEY_SCOPE_DELIMITER = "__";
export const LOST_CITIES_SELECTED_CARDS_MASK_KEY = `${ITEMIZED_SCORE_METADATA_PREFIX}lost_cities_selected_cards_mask`;

export const LOST_CITIES_EXPEDITIONS = [
  {
    categoryId: "yellow_expedition",
    color: "#d29b1f",
    emblem: "sun",
  },
  {
    categoryId: "blue_expedition",
    color: "#1e5da8",
    emblem: "wave",
  },
  {
    categoryId: "white_expedition",
    color: "#d8d1bf",
    emblem: "peak",
  },
  {
    categoryId: "green_expedition",
    color: "#2c7c55",
    emblem: "leaf",
  },
  {
    categoryId: "red_expedition",
    color: "#9f2f33",
    emblem: "flame",
  },
  {
    categoryId: "purple_expedition",
    color: "#6d3bb3",
    emblem: "star",
  },
] as const;

export type LostCitiesExpeditionCount = 5 | 6;

export function buildLostCitiesItemizedCategories(
  expeditionCount: LostCitiesExpeditionCount = 5,
) {
  return LOST_CITIES_CATEGORY_NAMES.slice(0, expeditionCount).map(
    (name, index) => ({
      id: `${name.toLowerCase().split(" ")[0]}_expedition`,
      name,
      optional: false,
      sortOrder: index,
      inputMode: "multi" as const,
      formula: LOST_CITIES_FORMULA,
      helpText: "Expedition",
      inputs: [
        { key: "card_sum", label: "Card sum", defaultValue: 0 },
        { key: "wagers", label: "Wagers", defaultValue: 0 },
        { key: "card_count", label: "Cards played", defaultValue: 0 },
      ],
    }),
  ) satisfies GameSettingsItemizedCategory[];
}

export function buildLostCitiesGameSettingsTemplate(
  expeditionCount: LostCitiesExpeditionCount = 5,
) {
  return validateGameSettingsV2({
    version: "v2",
    gameEndTrigger: "manual_finish",
    scoringType: "points",
    winMetric: "highest_score",
    initialPlayerScore: 0,
    roundConfig: { enabled: false, targetRounds: null },
    thresholdConfig: { value: null, direction: null },
    tiePolicy: { allowTies: true, resolution: "allow" },
    playerConfig: {
      minPlayers: 2,
      maxPlayers: 2,
      allPlayersAreManagers: false,
    },
    itemizedCategories: buildLostCitiesItemizedCategories(expeditionCount),
    resourceConfig: {},
    objectiveConfig: {},
  });
}

export function cloneGameSettingsV2WithFreshItemizedCategoryIds(
  settings: GameSettingsV2,
) {
  if (settings.itemizedCategories.length === 0) return settings;

  return validateGameSettingsV2({
    ...settings,
    itemizedCategories: settings.itemizedCategories.map((category) => ({
      ...category,
      id: `${createId()}${CATEGORY_KEY_SCOPE_DELIMITER}${category.id}`,
    })),
  });
}

export function isLostCitiesTitle(
  title: { normalizedTitle: string } | null | undefined,
) {
  return title?.normalizedTitle === LOST_CITIES_NORMALIZED_TITLE;
}

export function getScopedCategoryKeySuffix(categoryId: string) {
  return categoryId.split(CATEGORY_KEY_SCOPE_DELIMITER).at(-1) ?? categoryId;
}

export function getLostCitiesExpeditionDefinition(categoryId: string) {
  const suffix = getScopedCategoryKeySuffix(categoryId);
  return (
    LOST_CITIES_EXPEDITIONS.find(
      (expedition) => expedition.categoryId === suffix,
    ) ?? null
  );
}

export function getLostCitiesOrderedCategories(
  categories: GameSettingsItemizedCategory[],
) {
  return categories
    .map((category) => {
      const expedition = getLostCitiesExpeditionDefinition(category.id);
      return expedition ? { category, expedition } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort(
      (left, right) =>
        LOST_CITIES_EXPEDITIONS.indexOf(left.expedition) -
        LOST_CITIES_EXPEDITIONS.indexOf(right.expedition),
    );
}

export function buildLostCitiesCategoryValues(input: {
  selectedValues: number[];
  wagers: number;
}): ItemizedScoreEntryValues {
  const selectedValues = [...new Set(input.selectedValues)]
    .filter((value) => Number.isInteger(value) && value >= 2 && value <= 10)
    .sort((left, right) => left - right);
  const wagers = Math.max(0, Math.min(3, Math.trunc(input.wagers)));
  const selectedCardsMask = selectedValues.reduce(
    (mask, value) => mask | (1 << (value - 2)),
    0,
  );

  return {
    card_sum: selectedValues.reduce((sum, value) => sum + value, 0),
    wagers,
    card_count: selectedValues.length + wagers,
    [LOST_CITIES_SELECTED_CARDS_MASK_KEY]: selectedCardsMask,
  };
}

export function parseLostCitiesPersistedEntry(
  value: string | null | undefined,
) {
  const rawValues = parsePersistedItemizedValues(value);
  const mask = Math.max(
    0,
    Math.trunc(rawValues[LOST_CITIES_SELECTED_CARDS_MASK_KEY] ?? 0),
  );
  const selectedValues = Array.from(
    { length: 9 },
    (_, index) => index + 2,
  ).filter((cardValue) => (mask & (1 << (cardValue - 2))) !== 0);

  return {
    rawValues,
    selectedValues,
    wagers: Math.max(0, Math.min(3, Math.trunc(rawValues.wagers ?? 0))),
    cardCount: Math.max(0, Math.trunc(rawValues.card_count ?? 0)),
  };
}
