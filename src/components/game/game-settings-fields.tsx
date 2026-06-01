"use client";

import { Input } from "@/components/ui/input";
import type {
  GameEndingMode,
  GameScoreThresholdDirection,
  GameScoringMode,
} from "@/lib/db/schema";

export type EditableGameSettings = {
  scoringMode: GameScoringMode | null;
  endingMode: GameEndingMode | null;
  trackRounds: boolean | null;
  targetRounds: string;
  scoreThreshold: string;
  scoreThresholdDirection: GameScoreThresholdDirection | null;
};

function optionClassName(isActive: boolean) {
  return `rounded-3xl border p-4 text-left ${
    isActive
      ? "border-foreground bg-foreground text-background shadow-sm"
      : "border-border bg-card text-foreground hover:bg-muted"
  }`;
}

function compactOptionClassName(isActive: boolean) {
  return `rounded-2xl border p-3 text-sm font-bold ${
    isActive
      ? "border-foreground bg-foreground text-background shadow-sm"
      : "border-border bg-card text-foreground hover:bg-muted"
  }`;
}

export default function GameSettingsFields({
  allowUnset,
  value,
  onChange,
}: {
  allowUnset: boolean;
  value: EditableGameSettings;
  onChange: (nextValue: EditableGameSettings) => void;
}) {
  function update<K extends keyof EditableGameSettings>(
    key: K,
    nextValue: EditableGameSettings[K],
  ) {
    onChange({
      ...value,
      [key]: nextValue,
    });
  }

  const isNoScoreMode = value.scoringMode === "no_score";

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <h3 className="text-lg font-black">Who wins?</h3>
        <div className="flex flex-col gap-3">
          {allowUnset ? (
            <button
              className={optionClassName(value.scoringMode === null)}
              onClick={() => update("scoringMode", null)}
              type="button"
            >
              <p className="font-black">Use app default</p>
              <p className="text-sm opacity-80">
                Leave this unset on the title
              </p>
            </button>
          ) : null}
          <button
            className={optionClassName(value.scoringMode === "lowest_wins")}
            onClick={() => update("scoringMode", "lowest_wins")}
            type="button"
          >
            <p className="font-black">Lowest score</p>
            <p className="text-sm opacity-80">
              The player with the fewest points wins
            </p>
          </button>
          <button
            className={optionClassName(value.scoringMode === "highest_wins")}
            onClick={() => update("scoringMode", "highest_wins")}
            type="button"
          >
            <p className="font-black">Highest score</p>
            <p className="text-sm opacity-80">
              The player with the most points wins
            </p>
          </button>
          <button
            className={optionClassName(value.scoringMode === "no_score")}
            onClick={() =>
              onChange({
                ...value,
                scoringMode: "no_score",
                endingMode:
                  value.endingMode === "score_threshold"
                    ? "none"
                    : value.endingMode,
                trackRounds:
                  value.endingMode === "score_threshold"
                    ? false
                    : value.trackRounds,
                scoreThresholdDirection:
                  value.endingMode === "score_threshold"
                    ? null
                    : value.scoreThresholdDirection,
              })
            }
            type="button"
          >
            <p className="font-black">No score</p>
            <p className="text-sm opacity-80">Choose the winner</p>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-black">When should the game end?</h3>
        <div className="flex flex-col gap-3">
          {allowUnset ? (
            <button
              className={optionClassName(value.endingMode === null)}
              onClick={() =>
                onChange({
                  ...value,
                  endingMode: null,
                  trackRounds: null,
                  scoreThresholdDirection: null,
                })
              }
              type="button"
            >
              <p className="font-black">Use app default</p>
              <p className="text-sm opacity-80">Leave the end rules unset.</p>
            </button>
          ) : null}

          <button
            className={optionClassName(value.endingMode === "round_count")}
            onClick={() =>
              onChange({
                ...value,
                endingMode: "round_count",
                trackRounds: true,
              })
            }
            type="button"
          >
            <p className="font-black">After a set number of rounds</p>
            <p className="text-sm opacity-80">
              End the game after the chosen round is finished.
            </p>
          </button>
          {value.endingMode === "round_count" ? (
            <Input
              className="h-14 rounded-[1.4rem] bg-background px-4 text-lg"
              inputMode="numeric"
              min={1}
              onChange={(event) => update("targetRounds", event.target.value)}
              placeholder={allowUnset ? "Use app default (1)" : undefined}
              type="number"
              value={value.targetRounds}
            />
          ) : null}

          {!isNoScoreMode ? (
            <>
              <button
                className={optionClassName(
                  value.endingMode === "score_threshold",
                )}
                onClick={() =>
                  onChange({
                    ...value,
                    endingMode: "score_threshold",
                    trackRounds: true,
                    scoreThresholdDirection:
                      value.scoreThresholdDirection ?? "at_least",
                  })
                }
                type="button"
              >
                <p className="font-black">When a score hits a target</p>
                <p className="text-sm opacity-80">
                  When a player reaches a score
                </p>
              </button>
              {value.endingMode === "score_threshold" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    className="h-14 rounded-[1.4rem] bg-background px-4 text-lg"
                    inputMode="numeric"
                    min={1}
                    onChange={(event) =>
                      update("scoreThreshold", event.target.value)
                    }
                    placeholder={
                      allowUnset ? "Use app default (100)" : undefined
                    }
                    type="number"
                    value={value.scoreThreshold}
                  />
                  <div
                    className={`grid gap-2 ${
                      allowUnset ? "grid-cols-3" : "grid-cols-2"
                    }`}
                  >
                    {allowUnset ? (
                      <button
                        className={compactOptionClassName(
                          value.scoreThresholdDirection === null,
                        )}
                        onClick={() => update("scoreThresholdDirection", null)}
                        type="button"
                      >
                        Default
                      </button>
                    ) : null}
                    <button
                      className={compactOptionClassName(
                        value.scoreThresholdDirection === "at_least",
                      )}
                      onClick={() =>
                        update("scoreThresholdDirection", "at_least")
                      }
                      type="button"
                    >
                      Over
                    </button>
                    <button
                      className={compactOptionClassName(
                        value.scoreThresholdDirection === "at_most",
                      )}
                      onClick={() =>
                        update("scoreThresholdDirection", "at_most")
                      }
                      type="button"
                    >
                      Under
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <button
            className={optionClassName(value.endingMode === "none")}
            onClick={() =>
              onChange({
                ...value,
                endingMode: "none",
                trackRounds: value.trackRounds ?? false,
                scoreThresholdDirection: allowUnset
                  ? value.scoreThresholdDirection
                  : "at_least",
              })
            }
            type="button"
          >
            <p className="font-black">Free play</p>
            <p className="text-sm opacity-80">
              Keep playing as long as you want
            </p>
          </button>
          {value.endingMode === "none" ? (
            <div
              className={`grid gap-2 ${
                allowUnset ? "grid-cols-3" : "grid-cols-2"
              }`}
            >
              {allowUnset ? (
                <button
                  className={compactOptionClassName(value.trackRounds === null)}
                  onClick={() => update("trackRounds", null)}
                  type="button"
                >
                  Default
                </button>
              ) : null}
              <button
                className={compactOptionClassName(value.trackRounds === false)}
                onClick={() => update("trackRounds", false)}
                type="button"
              >
                No rounds
              </button>
              <button
                className={compactOptionClassName(value.trackRounds === true)}
                onClick={() => update("trackRounds", true)}
                type="button"
              >
                Include rounds
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
