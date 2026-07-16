import { describe, expect, it } from "vitest";
import { buildCumulativeScoreSeries } from "./score-breakdown-chart";

describe("buildCumulativeScoreSeries", () => {
  it("reconstructs starting scores and accumulates positive and negative rounds", () => {
    expect(
      buildCumulativeScoreSeries({
        players: [
          { userId: "one", score: 17 },
          { userId: "two", score: 5 },
        ],
        rounds: [
          {
            roundNumber: 2,
            scores: [
              { userId: "one", scoreDelta: -3 },
              { userId: "two", scoreDelta: 5 },
            ],
          },
          {
            roundNumber: 1,
            scores: [{ userId: "one", scoreDelta: 10 }],
          },
        ],
      }),
    ).toEqual([
      {
        userId: "one",
        points: [
          { roundLabel: "Start", roundNumber: 0, value: 10 },
          { roundLabel: "R1", roundNumber: 1, value: 20 },
          { roundLabel: "R2", roundNumber: 2, value: 17 },
        ],
      },
      {
        userId: "two",
        points: [
          { roundLabel: "Start", roundNumber: 0, value: 0 },
          { roundLabel: "R1", roundNumber: 1, value: 0 },
          { roundLabel: "R2", roundNumber: 2, value: 5 },
        ],
      },
    ]);
  });

  it("includes an in-progress round and carries missing scores forward", () => {
    expect(
      buildCumulativeScoreSeries({
        players: [
          { userId: "one", score: 9 },
          { userId: "two", score: 4 },
        ],
        rounds: [
          {
            roundNumber: 1,
            scores: [
              { userId: "one", scoreDelta: 4 },
              { userId: "two", scoreDelta: 4 },
            ],
          },
          {
            roundNumber: 2,
            scores: [{ userId: "one", scoreDelta: 5 }],
          },
        ],
      }),
    ).toEqual([
      {
        userId: "one",
        points: [
          { roundLabel: "Start", roundNumber: 0, value: 0 },
          { roundLabel: "R1", roundNumber: 1, value: 4 },
          { roundLabel: "R2", roundNumber: 2, value: 9 },
        ],
      },
      {
        userId: "two",
        points: [
          { roundLabel: "Start", roundNumber: 0, value: 0 },
          { roundLabel: "R1", roundNumber: 1, value: 4 },
          { roundLabel: "R2", roundNumber: 2, value: 4 },
        ],
      },
    ]);
  });
});
