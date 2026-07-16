import { describe, expect, it } from "vitest";
import {
  buildCreateGameSettingsFromTemplate,
  getCreateGameRankPointsLabel,
  getCreateGameSettingsTemplate,
  getCreateGameSettingsTitleSeed,
  getV2InitialPlayerScore,
  parseGameSettingsV2,
  projectV2SettingsToLegacy,
  validateGameSettingsV2,
} from "./v2";
import { V2_SETTINGS_CASES } from "../../../tests/helpers/v2-settings-cases";

describe("validateGameSettingsV2", () => {
  it("normalizes legacy round-winner settings into winner selection", () => {
    const settings = validateGameSettingsV2({
      gameEndTrigger: "rounds_exhausted",
      scoringType: "incremental",
      winMetric: "highest_score",
      roundConfig: {
        enabled: true,
        targetRounds: 5,
        requiresRoundWinner: true,
      },
    });

    expect(settings.scoringType).toBe("winner_selection");
    expect(settings.roundConfig).toEqual({ enabled: true, targetRounds: 5 });
    expect(projectV2SettingsToLegacy(settings)).toMatchObject({
      scoringMode: "highest_wins",
      endingMode: "round_count",
      trackRounds: true,
      targetRounds: 5,
    });
  });

  it("normalizes legacy end-game tally into roundless point scoring", () => {
    const settings = parseGameSettingsV2(
      JSON.stringify({
        version: "v2",
        gameEndTrigger: "manual_finish",
        scoringType: "end_game_tally",
        winMetric: "highest_score",
        roundConfig: { enabled: false, targetRounds: null },
        itemizedCategories: [
          { id: "coins", name: "Coins", value: 20, sortOrder: 0 },
        ],
      }),
    );

    expect(settings?.scoringType).toBe("points");
    expect(settings?.roundConfig.enabled).toBe(false);
    expect(settings?.itemizedCategories[0]).toMatchObject({
      id: "coins",
      formula: "count * 20",
    });
  });

  it("keeps initial scores and itemized categories only for point scoring", () => {
    const points = validateGameSettingsV2({
      gameEndTrigger: "manual_finish",
      scoringType: "points",
      winMetric: "highest_score",
      initialPlayerScore: 15,
      itemizedCategories: [
        {
          id: "coins",
          name: "Coins",
          inputMode: "single",
          formula: "count * 10",
          inputs: [{ key: "count", label: "Coins", defaultValue: 0 }],
        },
      ],
    });
    const winner = validateGameSettingsV2({
      gameEndTrigger: "manual_finish",
      scoringType: "winner_selection",
      initialPlayerScore: 15,
      itemizedCategories: points.itemizedCategories,
    });

    expect(getV2InitialPlayerScore(points)).toBe(15);
    expect(points.itemizedCategories).toHaveLength(1);
    expect(getV2InitialPlayerScore(winner)).toBe(0);
    expect(winner.itemizedCategories).toEqual([]);
  });

  it("supports single and multi-round elimination", () => {
    const single = validateGameSettingsV2({
      gameEndTrigger: "manual_finish",
      scoringType: "elimination",
      roundConfig: { enabled: false },
    });
    const rounds = validateGameSettingsV2({
      gameEndTrigger: "points_threshold_reached",
      scoringType: "elimination",
      roundConfig: { enabled: true },
      thresholdConfig: { value: 3, direction: "at_least" },
    });

    expect(single).toMatchObject({
      gameEndTrigger: "player_eliminated",
      winMetric: "last_man_standing",
    });
    expect(single.tiePolicy.allowTies).toBe(false);
    expect(rounds).toMatchObject({
      gameEndTrigger: "points_threshold_reached",
      winMetric: "highest_score",
      thresholdConfig: { value: 3, direction: "at_least" },
    });
  });

  it("clears fixed-round state when rounds are disabled", () => {
    expect(
      validateGameSettingsV2({
        gameEndTrigger: "rounds_exhausted",
        scoringType: "points",
        roundConfig: { enabled: false, targetRounds: 5 },
      }),
    ).toMatchObject({
      gameEndTrigger: "manual_finish",
      roundConfig: { enabled: false, targetRounds: null },
    });
  });

  it("removes end-condition configuration from roundless point games", () => {
    const settings = validateGameSettingsV2({
      gameEndTrigger: "points_threshold_reached",
      scoringType: "points",
      winMetric: "highest_score",
      roundConfig: { enabled: false },
      thresholdConfig: { value: 50, direction: "at_least" },
    });

    expect(settings).toMatchObject({
      gameEndTrigger: "manual_finish",
      roundConfig: { enabled: false, targetRounds: null },
      thresholdConfig: { value: null, direction: null },
    });
  });

  it.each([
    [
      "resource-pool endings",
      { gameEndTrigger: "resource_pool_depleted" as const },
      /not supported/i,
    ],
    [
      "objective wins",
      { winMetric: "objective_fulfilled" as const },
      /not supported/i,
    ],
    [
      "inverted player limits",
      { playerConfig: { minPlayers: 4, maxPlayers: 2 } },
      /minimum players/i,
    ],
    [
      "thresholds without values",
      {
        gameEndTrigger: "points_threshold_reached" as const,
        roundConfig: { enabled: true },
        thresholdConfig: { direction: "at_least" as const },
      },
      /score threshold/i,
    ],
  ])("rejects unsupported or incomplete %s", (_name, input, error) => {
    expect(() => validateGameSettingsV2(input)).toThrow(error);
  });
});

describe("create settings helpers", () => {
  it("enumerates every distinct editor combination without duplicate settings", () => {
    expect(V2_SETTINGS_CASES).toHaveLength(46);
    expect(
      new Set(V2_SETTINGS_CASES.map(({ settings }) => JSON.stringify(settings))).size,
    ).toBe(V2_SETTINGS_CASES.length);
  });

  it.each(V2_SETTINGS_CASES)(
    "round-trips $name",
    ({ settings }) => {
      expect(parseGameSettingsV2(JSON.stringify(settings))).toEqual(settings);
      expect(projectV2SettingsToLegacy(settings)).toMatchObject({
        trackRounds: settings.roundConfig.enabled,
      });
    },
  );

  it.each([
    [null, null, false],
    [2, null, false],
    [null, 4, false],
    [2, 4, false],
    [null, null, true],
    [2, null, true],
    [null, 4, true],
    [2, 4, true],
  ] as const)(
    "supports player rules min=%s max=%s allManagers=%s",
    (minPlayers, maxPlayers, allPlayersAreManagers) => {
      expect(
        validateGameSettingsV2({
          playerConfig: { minPlayers, maxPlayers, allPlayersAreManagers },
        }).playerConfig,
      ).toEqual({ minPlayers, maxPlayers, allPlayersAreManagers });
    },
  );

  it.each([
    ["point_scoring", "points"],
    ["choose_winner", "winner_selection"],
    ["elimination", "elimination"],
  ] as const)("builds %s settings", (template, scoringType) => {
    const settings = buildCreateGameSettingsFromTemplate({
      template,
      roundsEnabled: true,
      endConditionMode: "fixed_rounds",
      targetRounds: 6,
    });

    expect(settings.scoringType).toBe(scoringType);
    expect(settings.roundConfig).toEqual({ enabled: true, targetRounds: 6 });
    expect(getCreateGameSettingsTemplate(settings)).toBe(template);
  });

  it("builds no-round winner and elimination games with natural endings", () => {
    const winner = buildCreateGameSettingsFromTemplate({
      template: "choose_winner",
      roundsEnabled: false,
    });
    const elimination = buildCreateGameSettingsFromTemplate({
      template: "elimination",
      roundsEnabled: false,
    });

    expect(winner.gameEndTrigger).toBe("manual_finish");
    expect(elimination.gameEndTrigger).toBe("player_eliminated");
    expect(getCreateGameRankPointsLabel(elimination)).toBe(
      "Top 3 will earn Rank points",
    );
  });

  it("tracks Gameplay as an independent title-default section", () => {
    const seed = getCreateGameSettingsTitleSeed({
      defaultSettingsVersion: "v2",
      defaultSettingsJson: JSON.stringify(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
        }),
      ),
    });

    expect(seed.sectionsWithDefaults).toMatchObject({
      gameType: true,
      gameplay: true,
      endCondition: false,
    });
  });
});
