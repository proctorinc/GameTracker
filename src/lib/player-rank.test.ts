import { describe, expect, it } from "vitest";
import { assignDensePlayerRankPositions, computePlayerRankPayouts } from "./player-rank";

const baseConfig = {
  id: "config-1",
  windowMonths: 6,
  defaultMaxPrizePool: 40000,
  prizePoolByPlayerCount: {
    2: 5000,
    3: 10000,
    4: 20000,
    5: 30000,
  },
  smallGameDistribution: {
    2: [10000, 0, 0] as [number, number, number],
    3: [10000, 0, 0] as [number, number, number],
  },
  largeGameDistribution: [6000, 3000, 1000] as [number, number, number],
};

describe("computePlayerRankPayouts", () => {
  it("awards only 1st place in a 3-player game", () => {
    const payouts = computePlayerRankPayouts(
      {
        completedAt: "2026-01-01T00:00:00.000Z",
        scoringMode: "lowest_wins",
        players: [
          { userId: "a", score: 10 },
          { userId: "b", score: 15 },
          { userId: "c", score: 25 },
        ],
      },
      baseConfig,
    );

    expect(payouts.map((entry) => entry.pointsAwardedMinor)).toEqual([10000, 0, 0]);
  });

  it("awards top 3 places in a 5-player scored game", () => {
    const payouts = computePlayerRankPayouts(
      {
        completedAt: "2026-01-01T00:00:00.000Z",
        scoringMode: "highest_wins",
        players: [
          { userId: "a", score: 30 },
          { userId: "b", score: 24 },
          { userId: "c", score: 18 },
          { userId: "d", score: 12 },
          { userId: "e", score: 6 },
        ],
      },
      baseConfig,
    );

    expect(payouts.map((entry) => entry.pointsAwardedMinor)).toEqual([
      18000,
      9000,
      3000,
      0,
      0,
    ]);
  });

  it("splits tied 2nd and 3rd place payouts evenly", () => {
    const payouts = computePlayerRankPayouts(
      {
        completedAt: "2026-01-01T00:00:00.000Z",
        scoringMode: "highest_wins",
        players: [
          { userId: "a", score: 40 },
          { userId: "b", score: 30 },
          { userId: "c", score: 30 },
          { userId: "d", score: 5 },
        ],
      },
      baseConfig,
    );

    expect(payouts.find((entry) => entry.userId === "b")?.pointsAwardedMinor).toBe(4000);
    expect(payouts.find((entry) => entry.userId === "c")?.pointsAwardedMinor).toBe(4000);
  });

  it("splits winner-only payouts for no-score games", () => {
    const payouts = computePlayerRankPayouts(
      {
        completedAt: "2026-01-01T00:00:00.000Z",
        scoringMode: "no_score",
        players: [
          { userId: "a", score: 0 },
          { userId: "b", score: 0 },
          { userId: "c", score: 0 },
          { userId: "d", score: 0 },
        ],
        winnerUserIds: ["a", "b"],
      },
      baseConfig,
    );

    expect(payouts.find((entry) => entry.userId === "a")?.pointsAwardedMinor).toBe(6000);
    expect(payouts.find((entry) => entry.userId === "b")?.pointsAwardedMinor).toBe(6000);
    expect(payouts.find((entry) => entry.userId === "c")?.pointsAwardedMinor).toBe(0);
  });
});

describe("assignDensePlayerRankPositions", () => {
  it("uses dense ranking for tied totals", () => {
    const standings = assignDensePlayerRankPositions([
      {
        userId: "a",
        pointsAwardedMinor: 100,
        playerRankGamesCount: 1,
        topThreeFinishes: 1,
      },
      {
        userId: "b",
        pointsAwardedMinor: 100,
        playerRankGamesCount: 2,
        topThreeFinishes: 2,
      },
      {
        userId: "c",
        pointsAwardedMinor: 50,
        playerRankGamesCount: 1,
        topThreeFinishes: 1,
      },
    ]);

    expect(standings.map((row) => row.playerRankPosition)).toEqual([1, 1, 2]);
  });
});
