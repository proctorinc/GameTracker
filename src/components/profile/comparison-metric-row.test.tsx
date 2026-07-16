import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ComparisonMetricRow,
  compareMetricValues,
} from "./comparison-metric-row";

describe("compareMetricValues", () => {
  it("does not award a win on 0-0 ties", () => {
    expect(compareMetricValues({ current: 0, comparison: 0 })).toEqual({
      currentWins: false,
      comparisonWins: false,
    });
  });

  it("does not award a win when either value is missing", () => {
    expect(compareMetricValues({ current: null, comparison: 4 })).toEqual({
      currentWins: false,
      comparisonWins: false,
    });
  });

  it("still awards ties when non-zero values match", () => {
    expect(compareMetricValues({ current: 3, comparison: 3 })).toEqual({
      currentWins: true,
      comparisonWins: true,
    });
  });
});

describe("ComparisonMetricRow", () => {
  it("uses the profile color surface without a background image for winning stats", () => {
    const { container } = render(
      <ComparisonMetricRow
        label="Wins"
        currentValue={5}
        comparisonValue={2}
        currentWins
        comparisonWins={false}
        currentColor="#0f766e"
        comparisonColor="#f97316"
      />,
    );

    const winningPill = screen.getByText("5").parentElement;

    expect(container.querySelector("img")).toBeNull();
    expect(winningPill).toHaveStyle({
      backgroundColor: "#0f766e",
      boxShadow: "0 10px 24px rgba(15,23,42,0.18)",
    });
  });
});
