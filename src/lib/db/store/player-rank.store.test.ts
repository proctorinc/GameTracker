import { describe, expect, it } from "vitest";
import {
  buildDensePlayerRankChartPoints,
  summarizePlayerRankRecentChanges,
} from "./player-rank.store";

describe("summarizePlayerRankRecentChanges", () => {
  it("reports a full gain when the player started from zero inside the window", () => {
    const summary = summarizePlayerRankRecentChanges({
      recentDays: 30,
      points: [
        {
          historyDate: "2026-06-01",
          hasSnapshot: false,
          playerRankPosition: null,
          playerRankTotal: null,
          playerRankTotalMinor: null,
          playerRankGamesCount: null,
          topThreeFinishes: null,
        },
        {
          historyDate: "2026-06-30",
          hasSnapshot: true,
          playerRankPosition: 1,
          playerRankTotal: "588",
          playerRankTotalMinor: 58_800,
          playerRankGamesCount: 6,
          topThreeFinishes: 4,
        },
      ],
    });

    expect(summary.recentWindowLabel).toBe("Last 30 days");
    expect(summary.startRankTotalMinor).toBe(0);
    expect(summary.currentRankTotalMinor).toBe(58_800);
    expect(summary.recentIncrease?.deltaMinor).toBe(58_800);
    expect(summary.recentIncrease?.deltaFormatted).toBe("+588");
    expect(summary.recentDecrease).toBeNull();
  });

  it("uses the carried-forward opening total when the player already had rank", () => {
    const summary = summarizePlayerRankRecentChanges({
      recentDays: 30,
      points: [
        {
          historyDate: "2026-06-01",
          hasSnapshot: true,
          playerRankPosition: 3,
          playerRankTotal: "200",
          playerRankTotalMinor: 20_000,
          playerRankGamesCount: 2,
          topThreeFinishes: 2,
        },
        {
          historyDate: "2026-06-30",
          hasSnapshot: true,
          playerRankPosition: 1,
          playerRankTotal: "588",
          playerRankTotalMinor: 58_800,
          playerRankGamesCount: 6,
          topThreeFinishes: 4,
        },
      ],
    });

    expect(summary.startRankTotalMinor).toBe(20_000);
    expect(summary.currentRankTotalMinor).toBe(58_800);
    expect(summary.recentIncrease?.deltaMinor).toBe(38_800);
    expect(summary.recentIncrease?.deltaFormatted).toBe("+388");
    expect(summary.recentDecrease).toBeNull();
  });

  it("reports a net decline across the window", () => {
    const summary = summarizePlayerRankRecentChanges({
      recentDays: 30,
      points: [
        {
          historyDate: "2026-06-01",
          hasSnapshot: true,
          playerRankPosition: 1,
          playerRankTotal: "588",
          playerRankTotalMinor: 58_800,
          playerRankGamesCount: 6,
          topThreeFinishes: 4,
        },
        {
          historyDate: "2026-06-30",
          hasSnapshot: true,
          playerRankPosition: 4,
          playerRankTotal: "180",
          playerRankTotalMinor: 18_000,
          playerRankGamesCount: 7,
          topThreeFinishes: 4,
        },
      ],
    });

    expect(summary.recentIncrease).toBeNull();
    expect(summary.recentDecrease?.deltaMinor).toBe(-40_800);
    expect(summary.recentDecrease?.deltaFormatted).toBe("-408");
  });

  it("leaves both tiles empty when there is no movement", () => {
    const summary = summarizePlayerRankRecentChanges({
      recentDays: 30,
      points: [
        {
          historyDate: "2026-06-01",
          hasSnapshot: true,
          playerRankPosition: 2,
          playerRankTotal: "270",
          playerRankTotalMinor: 27_000,
          playerRankGamesCount: 4,
          topThreeFinishes: 3,
        },
        {
          historyDate: "2026-06-30",
          hasSnapshot: true,
          playerRankPosition: 2,
          playerRankTotal: "270",
          playerRankTotalMinor: 27_000,
          playerRankGamesCount: 4,
          topThreeFinishes: 3,
        },
      ],
    });

    expect(summary.netChange).toBeNull();
    expect(summary.recentIncrease).toBeNull();
    expect(summary.recentDecrease).toBeNull();
  });

  it("carries forward sparse snapshots into daily chart points", () => {
    const points = buildDensePlayerRankChartPoints({
      historyDateKeys: [
        "2026-06-01",
        "2026-06-02",
        "2026-06-03",
        "2026-06-04",
      ],
      snapshots: [
        {
          userId: "user-1",
          historyDate: "2026-06-01",
          playerRankPosition: 2,
          playerRankTotal: "120",
          playerRankTotalMinor: 12_000,
          playerRankGamesCount: 3,
          topThreeFinishes: 2,
        },
        {
          userId: "user-1",
          historyDate: "2026-06-04",
          playerRankPosition: 1,
          playerRankTotal: "160",
          playerRankTotalMinor: 16_000,
          playerRankGamesCount: 4,
          topThreeFinishes: 3,
        },
      ],
    });

    expect(points.map((point) => point.playerRankPosition)).toEqual([2, 2, 2, 1]);
    expect(points.map((point) => point.playerRankTotal)).toEqual([
      "120",
      "120",
      "120",
      "160",
    ]);
    expect(points.every((point) => point.hasSnapshot)).toBe(true);
  });
});
