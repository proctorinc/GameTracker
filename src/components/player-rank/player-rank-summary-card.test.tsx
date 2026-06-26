import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import { PlayerRankSummaryCard } from "./player-rank-summary-card";

describe("PlayerRankSummaryCard", () => {
  it("renders highlighted user identity when provided", () => {
    renderWithProviders(
      <PlayerRankSummaryCard
        title="Highlighted Player Rank"
        highlightedUser={{
          id: "user-2",
          firstName: "Amy",
          lastName: "Ace",
          color: "#f97316",
          displayName: "Amy Ace",
        }}
        rankTotal="220"
        rankPosition={2}
        rankGamesCount={5}
        topThreeFinishes={3}
        windowLabel="30-day rank history"
      />,
    );

    expect(screen.getByText("Amy Ace")).toBeInTheDocument();
    expect(screen.getByText("Highlighted Player")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("floors player rank totals instead of rounding them", () => {
    renderWithProviders(
      <PlayerRankSummaryCard
        rankTotal="220.9"
        rankPosition={1}
        rankGamesCount={3}
        topThreeFinishes={2}
        windowLabel="30-day rank history"
      />,
    );

    expect(screen.getByText("220")).toBeInTheDocument();
    expect(screen.queryByText("221")).not.toBeInTheDocument();
  });

  it("can hide the ranking column without rendering placeholder dashes", () => {
    renderWithProviders(
      <PlayerRankSummaryCard
        rankTotal="220"
        rankPosition={null}
        showRankPosition={false}
        rankGamesCount={3}
        topThreeFinishes={2}
        windowLabel="30-day rank history"
      />,
    );

    const summaryToggle = screen.getByRole("button", { expanded: false });

    expect(screen.queryByText("Ranking")).not.toBeInTheDocument();
    expect(summaryToggle).not.toHaveTextContent("--");
  });
});
