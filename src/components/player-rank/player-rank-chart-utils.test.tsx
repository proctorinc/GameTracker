import { describe, expect, it } from "vitest";
import { orderSeriesByHighlightedUser } from "./player-rank-chart-utils";

describe("orderSeriesByHighlightedUser", () => {
  it("moves the highlighted series to the end", () => {
    const series = [
      { userId: "user-1" },
      { userId: "user-2" },
      { userId: "user-3" },
    ];

    expect(
      orderSeriesByHighlightedUser({
        series,
        highlightedUserId: "user-2",
      }).map((entry) => entry.userId),
    ).toEqual(["user-1", "user-3", "user-2"]);
  });

  it("removes duplicate user series before ordering", () => {
    const firstUserTwo = { userId: "user-2", label: "First" };

    expect(
      orderSeriesByHighlightedUser({
        series: [
          { userId: "user-1", label: "One" },
          firstUserTwo,
          { userId: "user-2", label: "Duplicate" },
        ],
        highlightedUserId: "user-2",
      }),
    ).toEqual([{ userId: "user-1", label: "One" }, firstUserTwo]);
  });
});
