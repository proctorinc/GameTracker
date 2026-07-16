import { describe, expect, it } from "vitest";
import {
  buildCurrentSettings,
  buildValidatedSettings,
  createEditableCategory,
  createEditableSettings,
  getCategoryPreview,
  getGameplaySummary,
} from "./game-settings-v2";

describe("game settings v2 itemized formula helpers", () => {
  it("creates conditional default formulas for new editable categories", () => {
    expect(createEditableCategory("single").formula).toBe(
      "if(count >= 10, count * 25, count * 20)",
    );
    expect(createEditableCategory("multi").formula).toBe(
      "if(penalty > 0, count * points_each - penalty, count * points_each)",
    );
  });

  it("previews conditional formulas with the configured input defaults", () => {
    expect(
      getCategoryPreview({
        id: "coins",
        name: "Coins",
        optional: false,
        inputMode: "multi",
        formula:
          "if(count >= 10, count * points_each, count * points_each - penalty)",
        helpText: "",
        inputs: [
          { key: "count", label: "Count", defaultValue: "10" },
          { key: "points_each", label: "Points each", defaultValue: "3" },
          { key: "penalty", label: "Penalty", defaultValue: "4" },
        ],
      }),
    ).toBe("Preview: 30 points");
  });

  it("surfaces validation errors for invalid conditional formulas", () => {
    expect(
      getCategoryPreview({
        id: "coins",
        name: "Coins",
        optional: true,
        inputMode: "single",
        formula: "if(count > 0, count)",
        helpText: "",
        inputs: [{ key: "count", label: "Count", defaultValue: "3" }],
      }),
    ).toMatch(/if requires condition, true value, and false value/i);
  });

  it("keeps rendering settings while an itemized formula is invalid", () => {
    const draft = createEditableSettings(null);
    Object.assign(draft, {
      template: "point_scoring" as const,
      gameplayMode: "no_rounds" as const,
      winMetric: "highest_score" as const,
    });
    draft.itemizedCategories = [
      {
        id: "coins",
        categoryKey: "coins",
        name: "Coins",
        optional: false,
        inputMode: "single",
        formula: "c",
        helpText: "",
        inputs: [{ key: "count", label: "Count", defaultValue: "0" }],
      },
    ];

    expect(() => buildCurrentSettings(draft)).not.toThrow();
    expect(buildCurrentSettings(draft)).toMatchObject({
      scoringType: "points",
      itemizedCategories: [],
    });
    expect(getCategoryPreview(draft.itemizedCategories[0]!)).toBe(
      'Unknown input "c"',
    );
  });

  it("creates new categories as required unless optional is enabled", () => {
    expect(createEditableCategory("single").optional).toBe(false);
  });
});

describe("game settings v2 gameplay model", () => {
  it("requires an explicit gameplay choice", () => {
    const draft = createEditableSettings(null);
    draft.template = "point_scoring";
    draft.winMetric = "highest_score";
    draft.initialPlayerScore = "0";

    expect(() => buildValidatedSettings(draft)).toThrow(
      /Choose Rounds or No rounds/i,
    );
  });

  it("builds roundless point scoring as a single manual play-through", () => {
    const draft = createEditableSettings(null);
    Object.assign(draft, {
      template: "point_scoring",
      gameplayMode: "no_rounds",
      winMetric: "highest_score",
      initialPlayerScore: "0",
      endConditionMode: "score_threshold",
      thresholdValue: "50",
    });

    expect(buildValidatedSettings(draft)).toMatchObject({
      scoringType: "points",
      gameEndTrigger: "manual_finish",
      roundConfig: { enabled: false, targetRounds: null },
      thresholdConfig: { value: null, direction: null },
    });
    expect(getGameplaySummary(draft)).toBe("No rounds");
  });

  it("builds multi-round winner selection with a win target", () => {
    const draft = createEditableSettings(null);
    Object.assign(draft, {
      template: "choose_winner",
      gameplayMode: "rounds",
      winMetric: "highest_score",
      endConditionMode: "score_threshold",
      thresholdValue: "3",
    });

    expect(buildValidatedSettings(draft)).toMatchObject({
      scoringType: "winner_selection",
      gameEndTrigger: "points_threshold_reached",
      roundConfig: { enabled: true },
      thresholdConfig: { value: 3, direction: "at_least" },
    });
  });
});
