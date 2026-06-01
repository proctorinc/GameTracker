import { describe, expect, it } from "vitest";
import {
  APP_GAME_SETTINGS_DEFAULTS,
  gameSettingsToTitleDefaults,
  normalizeGameTitleDefaults,
  resolveGameSettingsDefaults,
} from "./title-defaults";

describe("title defaults helpers", () => {
  it("falls back to app defaults for unset title values", () => {
    expect(
      resolveGameSettingsDefaults({
        defaultScoringMode: "lowest_wins",
        defaultEndingMode: "score_threshold",
        defaultScoreThreshold: null,
        defaultScoreThresholdDirection: null,
      }),
    ).toEqual({
      ...APP_GAME_SETTINGS_DEFAULTS,
      scoringMode: "lowest_wins",
      endingMode: "score_threshold",
      trackRounds: true,
    });
  });

  it("clears irrelevant saved values for non-matching ending modes", () => {
    expect(
      normalizeGameTitleDefaults({
        defaultScoringMode: "highest_wins",
        defaultEndingMode: "round_count",
        defaultTrackRounds: false,
        defaultTargetRounds: 5,
        defaultScoreThreshold: 100,
        defaultScoreThresholdDirection: "at_most",
      }),
    ).toEqual({
      defaultScoringMode: "highest_wins",
      defaultEndingMode: "round_count",
      defaultTrackRounds: null,
      defaultTargetRounds: 5,
      defaultScoreThreshold: null,
      defaultScoreThresholdDirection: null,
    });
  });

  it("stores complete game settings as title defaults", () => {
    expect(
      gameSettingsToTitleDefaults({
        scoringMode: "lowest_wins",
        endingMode: "score_threshold",
        trackRounds: true,
        targetRounds: 1,
        scoreThreshold: 100,
        scoreThresholdDirection: "at_least",
      }),
    ).toEqual({
      defaultScoringMode: "lowest_wins",
      defaultEndingMode: "score_threshold",
      defaultTrackRounds: null,
      defaultTargetRounds: null,
      defaultScoreThreshold: 100,
      defaultScoreThresholdDirection: "at_least",
    });
  });

  it("preserves the free-play rounds toggle in defaults", () => {
    expect(
      gameSettingsToTitleDefaults({
        scoringMode: "highest_wins",
        endingMode: "none",
        trackRounds: true,
        targetRounds: 1,
        scoreThreshold: 100,
        scoreThresholdDirection: "at_least",
      }),
    ).toEqual({
      defaultScoringMode: "highest_wins",
      defaultEndingMode: "none",
      defaultTrackRounds: true,
      defaultTargetRounds: null,
      defaultScoreThreshold: null,
      defaultScoreThresholdDirection: null,
    });
  });
});
