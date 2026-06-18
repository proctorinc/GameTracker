import { describe, expect, it } from "vitest";
import { summarizePlayerRankRecentChanges } from "./player-rank.store";

describe("summarizePlayerRankRecentChanges", () => {
  it("picks the latest change and latest increase from recent deltas", () => {
    const summary = summarizePlayerRankRecentChanges({
      recentDays: 30,
      deltas: [
        {
          gameId: "game-2",
          userId: "user-1",
          deltaMinor: 0,
          deltaFormatted: "0",
          completedAt: "2026-06-18T10:00:00.000Z",
        },
        {
          gameId: "game-1",
          userId: "user-1",
          deltaMinor: 5000,
          deltaFormatted: "+50",
          completedAt: "2026-06-17T10:00:00.000Z",
        },
      ],
    });

    expect(summary.recentWindowLabel).toBe("Last 30 days");
    expect(summary.recentGamesCount).toBe(2);
    expect(summary.latestChange?.gameId).toBe("game-2");
    expect(summary.latestIncrease?.gameId).toBe("game-1");
    expect(summary.latestDecrease).toBeNull();
  });
});
