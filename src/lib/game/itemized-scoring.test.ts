import { describe, expect, it } from "vitest";
import {
  buildItemizedPlayerBreakdowns,
  evaluateSafeMathExpression,
  normalizeItemizedValues,
  validateSafeMathExpression,
} from "./itemized-scoring";

describe("itemized scoring formulas", () => {
  it("evaluates safe arithmetic expressions", () => {
    expect(
      evaluateSafeMathExpression({
        expression: "count * 20 - penalty",
        values: {
          count: 3,
          penalty: 5,
        },
      }),
    ).toEqual({
      rawScore: 55,
      normalizedScore: 55,
    });
  });

  it("supports helper functions", () => {
    expect(
      evaluateSafeMathExpression({
        expression:
          "max(count * points_each, bonus) - abs(penalty) + bonus_if_ge(rounds, 8, 20)",
        values: {
          count: 2,
          points_each: 10,
          bonus: 15,
          penalty: -3,
          rounds: 8,
        },
      }).normalizedScore,
    ).toBe(37);
  });

  it("supports comparisons, conditionals, and modulo", () => {
    expect(
      evaluateSafeMathExpression({
        expression:
          "if(count >= 10, count * points_each, count * points_each - penalty)",
        values: {
          count: 10,
          points_each: 3,
          penalty: 8,
        },
      }).normalizedScore,
    ).toBe(30);

    expect(
      evaluateSafeMathExpression({
        expression: "if(penalty != 0, penalty % 4, 99)",
        values: {
          penalty: 10,
        },
      }).normalizedScore,
    ).toBe(2);

    expect(
      evaluateSafeMathExpression({
        expression: "count == 3",
        values: {
          count: 3,
        },
      }).normalizedScore,
    ).toBe(1);
  });

  it("rejects unknown identifiers and unsafe syntax", () => {
    expect(() =>
      validateSafeMathExpression({
        expression: "window.alert(count)",
        allowedIdentifiers: ["count"],
      }),
    ).toThrow(/invalid number|unsupported character|unknown helper/i);

    expect(() =>
      validateSafeMathExpression({
        expression: "count + bonus",
        allowedIdentifiers: ["count"],
      }),
    ).toThrow(/unknown input/i);

    expect(() =>
      evaluateSafeMathExpression({
        expression: "count % 0",
        values: {
          count: 3,
        },
      }),
    ).toThrow(/modulo by zero/i);

    expect(() =>
      evaluateSafeMathExpression({
        expression: "if(count > 0, count)",
        values: {
          count: 3,
        },
      }),
    ).toThrow(/if requires condition, true value, and false value/i);
  });

  it("builds completed-game player breakdowns from persisted values", () => {
    const breakdowns = buildItemizedPlayerBreakdowns({
      categories: [
        {
          id: "coins",
          name: "Coins",
          optional: false,
          sortOrder: 0,
          inputMode: "single",
          formula: "count * 20",
          helpText: null,
          inputs: [
            {
              key: "count",
              label: "Coins",
              defaultValue: 0,
            },
          ],
        },
      ],
      players: [
        { userId: "u1", score: 60 },
        { userId: "u2", score: 20 },
      ],
      entries: [
        {
          userId: "u1",
          categoryId: "coins",
          valuesJson: JSON.stringify({ count: 3 }),
        },
        {
          userId: "u2",
          categoryId: "coins",
          valuesJson: JSON.stringify({ count: 1 }),
        },
      ],
    });

    expect(breakdowns[0]).toMatchObject({
      userId: "u1",
      totalScore: 60,
      lines: [
        {
          categoryId: "coins",
          score: 60,
          values: { count: 3 },
        },
      ],
    });
  });

  it("ignores hidden metadata keys during value normalization", () => {
    expect(
      normalizeItemizedValues({
        category: {
          inputs: [
            {
              key: "score",
              label: "Score",
              defaultValue: 0,
            },
          ],
        },
        values: {
          score: 17,
          __hidden_mask: 255,
        },
      }),
    ).toEqual({
      score: 17,
    });
  });

  it("reports skipped optional categories as zero", () => {
    const [breakdown] = buildItemizedPlayerBreakdowns({
      categories: [
        {
          id: "bonus",
          name: "Bonus",
          optional: true,
          sortOrder: 0,
          inputMode: "single",
          formula: "count + 10",
          helpText: null,
          inputs: [{ key: "count", label: "Count", defaultValue: 0 }],
        },
      ],
      players: [{ userId: "u1", score: null }],
      entries: [
        {
          userId: "u1",
          categoryId: "bonus",
          valuesJson: JSON.stringify({ count: 0, __included: 0 }),
        },
      ],
    });

    expect(breakdown).toMatchObject({ totalScore: 0, lines: [{ score: 0 }] });
  });
});
