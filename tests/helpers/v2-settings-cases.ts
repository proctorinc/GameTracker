import {
  buildCreateGameSettingsFromTemplate,
  serializeGameSettingsV2,
  type CreateGameSettingsTemplate,
  type GameSettingsItemizedCategory,
  type GameSettingsV2,
} from "../../src/lib/game/v2";

export type V2SettingsCase = {
  name: string;
  settings: GameSettingsV2;
  expectedVariant:
    | "elimination"
    | "end-game-tally"
    | "incremental"
    | "round-winner";
};

export const REPRESENTATIVE_TARGET_ROUNDS = 2;
export const REPRESENTATIVE_INITIAL_SCORE = 10;

export const REPRESENTATIVE_ITEMIZED_CATEGORIES = [
  {
    id: "points",
    name: "Points",
    optional: false,
    sortOrder: 0,
    inputMode: "single",
    formula: "count",
    helpText: "The player's points for this scoring period",
    inputs: [{ key: "count", label: "Points", defaultValue: 0 }],
  },
] satisfies GameSettingsItemizedCategory[];

const templates = [
  "point_scoring",
  "choose_winner",
  "elimination",
] as const satisfies readonly CreateGameSettingsTemplate[];
const endConditions = ["manual", "fixed_rounds", "score_threshold"] as const;

function expectedVariant(settings: GameSettingsV2): V2SettingsCase["expectedVariant"] {
  if (settings.itemizedCategories.length > 0) {
    return settings.roundConfig.enabled ? "incremental" : "end-game-tally";
  }
  if (settings.scoringType === "elimination") return "elimination";
  if (settings.scoringType === "winner_selection") return "round-winner";
  return "incremental";
}

/**
 * Enumerates every distinct settings combination exposed by the v2 editor.
 * Numeric fields deliberately use one representative value because their
 * ranges are unbounded and do not create additional behavior branches.
 */
export function buildV2SettingsCases(): V2SettingsCase[] {
  const cases: V2SettingsCase[] = [];
  const seen = new Set<string>();

  for (const template of templates) {
    for (const roundsEnabled of [false, true]) {
      const winMetrics =
        template === "point_scoring"
          ? (["highest_score", "lowest_score"] as const)
          : (["highest_score"] as const);
      const availableEndConditions = roundsEnabled
        ? endConditions
        : (["manual"] as const);
      const itemizedChoices =
        template === "point_scoring" ? [false, true] : [false];

      for (const winMetric of winMetrics) {
        for (const endConditionMode of availableEndConditions) {
          for (const allowTies of [false, true]) {
            for (const itemized of itemizedChoices) {
              const settings = buildCreateGameSettingsFromTemplate({
                template,
                roundsEnabled,
                endConditionMode,
                winMetric,
                targetRounds: REPRESENTATIVE_TARGET_ROUNDS,
                thresholdValue: winMetric === "lowest_score" ? 8 : 2,
                initialPlayerScore:
                  winMetric === "lowest_score"
                    ? REPRESENTATIVE_INITIAL_SCORE
                    : 0,
                allowTies,
                itemizedCategories: itemized
                  ? REPRESENTATIVE_ITEMIZED_CATEGORIES
                  : [],
              });
              const signature = serializeGameSettingsV2(settings);

              // Roundless winner-selection and elimination normalize tie
              // behavior, so duplicate editor inputs represent one setting.
              if (seen.has(signature)) continue;
              seen.add(signature);

              const name = [
                template,
                roundsEnabled ? "rounds" : "no-rounds",
                winMetric,
                endConditionMode,
                allowTies ? "ties" : "no-ties",
                itemized ? "itemized" : "plain",
              ].join(" / ");

              cases.push({ name, settings, expectedVariant: expectedVariant(settings) });
            }
          }
        }
      }
    }
  }

  return cases;
}

export const V2_SETTINGS_CASES = buildV2SettingsCases();
