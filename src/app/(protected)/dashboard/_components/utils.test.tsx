import { describe, expect, it } from "vitest";
import {
  getPlayerPlacement,
  getPlayerPlacementDisplay,
  getPlayersOrderedByPlacement,
  getWinnerUserIds,
} from "./utils";

describe("getPlayerPlacement", () => {
  it("uses dense ranking for lowest score wins games", () => {
    const game = {
      scoringMode: "lowest_wins" as const,
      players: [
        { userId: "u1", score: 10 },
        { userId: "u2", score: 20 },
        { userId: "u3", score: 20 },
        { userId: "u4", score: 30 },
      ],
    };

    expect(getPlayerPlacement(game, "u1")).toBe(1);
    expect(getPlayerPlacement(game, "u2")).toBe(2);
    expect(getPlayerPlacement(game, "u3")).toBe(2);
    expect(getPlayerPlacement(game, "u4")).toBe(3);
  });

  it("uses dense ranking for highest score wins games", () => {
    const game = {
      scoringMode: "highest_wins" as const,
      players: [
        { userId: "u1", score: 30 },
        { userId: "u2", score: 20 },
        { userId: "u3", score: 20 },
        { userId: "u4", score: 10 },
      ],
    };

    expect(getPlayerPlacement(game, "u1")).toBe(1);
    expect(getPlayerPlacement(game, "u2")).toBe(2);
    expect(getPlayerPlacement(game, "u3")).toBe(2);
    expect(getPlayerPlacement(game, "u4")).toBe(3);
  });

  it("returns null for no-score games without winners or podium placements", () => {
    const game = {
      scoringMode: "no_score" as const,
      players: [
        { userId: "u1", score: 30 },
        { userId: "u2", score: 20 },
      ],
      winners: [],
      resultPlacements: [],
    };

    expect(getPlayerPlacement(game, "u1")).toBeNull();
  });

  it("returns first place for winner-only no-score games without inventing other places", () => {
    const game = {
      scoringMode: "no_score" as const,
      players: [
        { userId: "u1", score: 0 },
        { userId: "u2", score: 0 },
        { userId: "u3", score: 0 },
      ],
      winners: [{ userId: "u1" }],
      resultPlacements: [],
    };

    expect(getPlayerPlacement(game, "u1")).toBe(1);
    expect(getPlayerPlacement(game, "u2")).toBeNull();
    expect(getPlayerPlacementDisplay(game, "u1", "")?.label).toBe("Won");
    expect(getWinnerUserIds(game)).toEqual(["u1"]);
  });

  it("uses explicit no-score podium placements when they exist", () => {
    const game = {
      scoringMode: "no_score" as const,
      players: [
        { userId: "u1", score: 0 },
        { userId: "u2", score: 0 },
        { userId: "u3", score: 0 },
        { userId: "u4", score: 0 },
      ],
      winners: [{ userId: "u1" }, { userId: "u2" }],
      resultPlacements: [
        { userId: "u1", placement: 1 },
        { userId: "u2", placement: 1 },
        { userId: "u3", placement: 2 },
      ],
    };

    expect(getPlayerPlacement(game, "u1")).toBe(1);
    expect(getPlayerPlacement(game, "u2")).toBe(1);
    expect(getPlayerPlacement(game, "u3")).toBe(2);
    expect(getPlayerPlacement(game, "u4")).toBeNull();
    expect(getPlayerPlacementDisplay(game, "u1", "")?.label).toBe("1st");
    expect(getPlayerPlacementDisplay(game, "u3", "")?.label).toBe("2nd");
  });

  it("returns null before any rounds when scores are still untouched", () => {
    const game = {
      scoringMode: "lowest_wins" as const,
      completedRounds: 0,
      players: [
        { userId: "u1", score: 0 },
        { userId: "u2", score: 0 },
        { userId: "u3", score: 0 },
      ],
    };

    expect(getPlayerPlacement(game, "u1")).toBeNull();
  });

  it("still returns tied placement after rounds have been played", () => {
    const game = {
      scoringMode: "lowest_wins" as const,
      completedRounds: 2,
      players: [
        { userId: "u1", score: 12 },
        { userId: "u2", score: 12 },
        { userId: "u3", score: 18 },
      ],
    };

    expect(getPlayerPlacement(game, "u1")).toBe(1);
    expect(getPlayerPlacement(game, "u2")).toBe(1);
    expect(getPlayerPlacement(game, "u3")).toBe(2);
  });

  it("orders players by placement using the game scoring mode", () => {
    const lowestWinsGame = {
      scoringMode: "lowest_wins" as const,
      completedRounds: 1,
      players: [
        { userId: "u1", score: 20 },
        { userId: "u2", score: 8 },
        { userId: "u3", score: 14 },
      ],
    };

    const highestWinsGame = {
      scoringMode: "highest_wins" as const,
      completedRounds: 1,
      players: [
        { userId: "u1", score: 20 },
        { userId: "u2", score: 8 },
        { userId: "u3", score: 14 },
      ],
    };

    expect(getPlayersOrderedByPlacement(lowestWinsGame).map((player) => player.userId)).toEqual([
      "u2",
      "u3",
      "u1",
    ]);
    expect(getPlayersOrderedByPlacement(highestWinsGame).map((player) => player.userId)).toEqual([
      "u1",
      "u3",
      "u2",
    ]);
  });

  it("orders no-score players by explicit podium placement and leaves unplaced players after them", () => {
    const game = {
      scoringMode: "no_score" as const,
      players: [
        { userId: "u4", score: 0 },
        { userId: "u2", score: 0 },
        { userId: "u1", score: 0 },
        { userId: "u3", score: 0 },
      ],
      winners: [{ userId: "u1" }],
      resultPlacements: [
        { userId: "u1", placement: 1 },
        { userId: "u3", placement: 2 },
      ],
    };

    expect(getPlayersOrderedByPlacement(game).map((player) => player.userId)).toEqual([
      "u1",
      "u3",
      "u4",
      "u2",
    ]);
  });
});
