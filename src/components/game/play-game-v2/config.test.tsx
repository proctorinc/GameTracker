import { describe, expect, it } from "vitest";
import { buildPlayGameV2Config } from "./config";
import { V2_SETTINGS_CASES } from "../../../../tests/helpers/v2-settings-cases";

function createGameSettingsJson(value: object) {
  return JSON.stringify(value);
}

describe("buildPlayGameV2Config", () => {
  it.each(V2_SETTINGS_CASES)(
    "builds a playable config for $name",
    ({ expectedVariant, settings }) => {
      const config = buildPlayGameV2Config({
        settingsJson: JSON.stringify(settings),
      });

      expect(config.variant).toBe(expectedVariant);
      expect(config.showsRounds).toBe(settings.roundConfig.enabled);
      expect(config.canCommitRound).toBe(settings.roundConfig.enabled);
      expect(config.canFinishGame).toBe(true);
      expect(config.itemizedCategories).toEqual(settings.itemizedCategories);
    },
  );

  it("maps incremental settings to the incremental variant", () => {
    const config = buildPlayGameV2Config({
      settingsJson: createGameSettingsJson({
        version: "v2",
        gameEndTrigger: "manual_finish",
        scoringType: "incremental",
        winMetric: "highest_score",
        initialPlayerScore: 0,
        roundConfig: {
          enabled: true,
          targetRounds: null,
          requiresRoundWinner: false,
        },
        tiePolicy: {
          allowTies: true,
          resolution: "allow",
        },
      }),
    });

    expect(config.variant).toBe("incremental");
    expect(config.supportsLiveScoreEntry).toBe(true);
    expect(config.supportsRoundWinnerSelection).toBe(false);
  });

  it("maps round-winner settings to the round-winner variant", () => {
    const config = buildPlayGameV2Config({
      settingsJson: createGameSettingsJson({
        version: "v2",
        gameEndTrigger: "rounds_exhausted",
        scoringType: "incremental",
        winMetric: "highest_score",
        initialPlayerScore: 0,
        roundConfig: {
          enabled: true,
          targetRounds: 5,
          requiresRoundWinner: true,
        },
        tiePolicy: {
          allowTies: false,
          resolution: "manual_winner_override",
        },
      }),
    });

    expect(config.variant).toBe("round-winner");
    expect(config.supportsRoundWinnerSelection).toBe(true);
    expect(config.supportsLiveScoreEntry).toBe(false);
  });

  it("maps elimination settings to the elimination variant", () => {
    const config = buildPlayGameV2Config({
      settingsJson: createGameSettingsJson({
        version: "v2",
        gameEndTrigger: "player_eliminated",
        scoringType: "ranked_placement_only",
        winMetric: "last_man_standing",
        initialPlayerScore: 0,
        roundConfig: {
          enabled: false,
          targetRounds: null,
          requiresRoundWinner: false,
        },
        tiePolicy: {
          allowTies: false,
          resolution: "manual_placement_override",
        },
      }),
    });

    expect(config.variant).toBe("elimination");
    expect(config.supportsEliminationFlow).toBe(true);
    expect(config.requiresPlacementTieBreak).toBe(true);
  });

  it("keeps multi-round elimination in the elimination flow with scored rounds", () => {
    const config = buildPlayGameV2Config({
      settingsJson: createGameSettingsJson({
        version: "v2",
        gameEndTrigger: "rounds_exhausted",
        scoringType: "elimination",
        winMetric: "highest_score",
        roundConfig: { enabled: true, targetRounds: 3 },
        tiePolicy: { allowTies: true, resolution: "allow" },
      }),
    });

    expect(config.variant).toBe("elimination");
    expect(config.showsRounds).toBe(true);
    expect(config.canCommitRound).toBe(true);
  });

  it("maps roundless winner selection to a single winner flow", () => {
    const config = buildPlayGameV2Config({
      settingsJson: createGameSettingsJson({
        version: "v2",
        gameEndTrigger: "manual_finish",
        scoringType: "winner_selection",
        winMetric: "highest_score",
        roundConfig: { enabled: false, targetRounds: null },
      }),
    });

    expect(config.variant).toBe("round-winner");
    expect(config.showsRounds).toBe(false);
    expect(config.supportsRoundWinnerSelection).toBe(true);
  });

  it("maps end-game tally settings to the end-game-tally variant", () => {
    const config = buildPlayGameV2Config({
      settingsJson: createGameSettingsJson({
        version: "v2",
        gameEndTrigger: "manual_finish",
        scoringType: "end_game_tally",
        winMetric: "highest_score",
        initialPlayerScore: 0,
        roundConfig: {
          enabled: false,
          targetRounds: null,
          requiresRoundWinner: false,
        },
        tiePolicy: {
          allowTies: true,
          resolution: "allow",
        },
        itemizedCategories: [
          {
            id: "tricks",
            name: "Tricks",
            value: 10,
            sortOrder: 0,
          },
        ],
      }),
    });

    expect(config.variant).toBe("end-game-tally");
    expect(config.supportsEndGameTally).toBe(true);
    expect(config.canCommitRound).toBe(false);
  });

  it("throws when settings are missing", () => {
    expect(() =>
      buildPlayGameV2Config({
        settingsJson: null,
      }),
    ).toThrow("Missing v2 game settings");
  });
});
