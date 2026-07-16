import { describe, expect, it } from "vitest";
import { buildGameTitleRankChartPoints } from "./game-title-rank-chart";

describe("buildGameTitleRankChartPoints", () => {
  it("builds a dense 90-day cumulative series and combines same-day results", () => {
    const points = buildGameTitleRankChartPoints({
      now: new Date("2026-07-16T18:00:00.000Z"),
      results: [
        {
          completedAt: "2026-04-17T10:00:00.000Z",
          pointsAwardedMinor: 9_999,
        },
        {
          completedAt: "2026-04-18T10:00:00.000Z",
          pointsAwardedMinor: 1_000,
        },
        {
          completedAt: "2026-04-18T20:00:00.000Z",
          pointsAwardedMinor: 2_500,
        },
        {
          completedAt: "2026-04-20T10:00:00.000Z",
          pointsAwardedMinor: 500,
        },
      ],
    });

    expect(points).toHaveLength(90);
    expect(points[0]).toMatchObject({
      historyDate: "2026-04-18",
      playerRankTotalMinor: 3_500,
      playerRankTotal: "35",
    });
    expect(points[1]).toMatchObject({
      historyDate: "2026-04-19",
      playerRankTotalMinor: 3_500,
    });
    expect(points[2]).toMatchObject({
      historyDate: "2026-04-20",
      playerRankTotalMinor: 4_000,
      playerRankTotal: "40",
    });
    expect(points.at(-1)?.historyDate).toBe("2026-07-16");
  });

  it("renders a zero baseline until the first title result", () => {
    const points = buildGameTitleRankChartPoints({
      now: new Date("2026-07-16T18:00:00.000Z"),
      days: 3,
      results: [
        {
          completedAt: "2026-07-16T10:00:00.000Z",
          pointsAwardedMinor: 1_500,
        },
      ],
    });

    expect(points.slice(0, 2)).toEqual([
      expect.objectContaining({
        historyDate: "2026-07-14",
        hasSnapshot: false,
        playerRankTotalMinor: null,
      }),
      expect.objectContaining({
        historyDate: "2026-07-15",
        hasSnapshot: false,
        playerRankTotalMinor: null,
      }),
    ]);
    expect(points[2]).toMatchObject({
      hasSnapshot: true,
      playerRankTotalMinor: 1_500,
    });
  });
});
