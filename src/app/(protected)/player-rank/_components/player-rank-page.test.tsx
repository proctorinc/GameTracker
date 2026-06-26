import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../../../tests/helpers/render";
import { PlayerRankPageView } from "./player-rank-page";

function buildData() {
  return {
    canViewPlayerRank: true,
    currentUserId: "user-1",
    playerRankWindowLabel: "30-day rank history",
    twoPlayerPrizePool: "50",
    threePlayerPrizePool: "100",
    sixPlusPlayerPrizePool: "400",
    comparisonSeries: [
      {
        userId: "user-1",
        firstName: "Maya",
        lastName: "Viewer",
        displayName: "Maya Viewer",
        color: "#22c55e",
        isCurrentUser: true,
        currentRankTotal: "180",
        currentRankTotalMinor: 18_000,
        currentPosition: 1,
        friendPosition: 1,
        playerRankGamesCount: 4,
        topThreeFinishes: 2,
        chartPoints: [
          {
            historyDate: "2026-06-16",
            hasSnapshot: true,
            playerRankPosition: 4,
            playerRankTotal: "120",
            playerRankTotalMinor: 12_000,
            playerRankGamesCount: 3,
            topThreeFinishes: 1,
          },
          {
            historyDate: "2026-06-17",
            hasSnapshot: true,
            playerRankPosition: 4,
            playerRankTotal: "120",
            playerRankTotalMinor: 12_000,
            playerRankGamesCount: 3,
            topThreeFinishes: 1,
          },
          {
            historyDate: "2026-06-18",
            hasSnapshot: true,
            playerRankPosition: 3,
            playerRankTotal: "180",
            playerRankTotalMinor: 18_000,
            playerRankGamesCount: 4,
            topThreeFinishes: 2,
          },
        ],
        hasHistory: true,
      },
      {
        userId: "user-2",
        firstName: "Amy",
        lastName: "Ace",
        displayName: "Amy Ace",
        color: "#f97316",
        isCurrentUser: false,
        currentRankTotal: "220",
        currentRankTotalMinor: 22_000,
        currentPosition: 2,
        friendPosition: 2,
        playerRankGamesCount: 5,
        topThreeFinishes: 3,
        chartPoints: [
          {
            historyDate: "2026-06-16",
            hasSnapshot: true,
            playerRankPosition: 2,
            playerRankTotal: "220",
            playerRankTotalMinor: 22_000,
            playerRankGamesCount: 5,
            topThreeFinishes: 3,
          },
          {
            historyDate: "2026-06-17",
            hasSnapshot: true,
            playerRankPosition: 2,
            playerRankTotal: "220",
            playerRankTotalMinor: 22_000,
            playerRankGamesCount: 5,
            topThreeFinishes: 3,
          },
          {
            historyDate: "2026-06-18",
            hasSnapshot: true,
            playerRankPosition: 2,
            playerRankTotal: "220",
            playerRankTotalMinor: 22_000,
            playerRankGamesCount: 5,
            topThreeFinishes: 3,
          },
        ],
        hasHistory: true,
      },
    ],
    summaryByUserId: {
      "user-1": {
        userId: "user-1",
        firstName: "Maya",
        lastName: "Viewer",
        displayName: "Maya Viewer",
        color: "#22c55e",
        rankTotal: "180",
        rankPosition: 1,
        rankGamesCount: 4,
        topThreeFinishes: 2,
        recentChangeSummary: {
          recentWindowLabel: "Last 30 days",
          startRankTotal: "120",
          startRankTotalMinor: 12_000,
          currentRankTotal: "180",
          currentRankTotalMinor: 18_000,
          netChange: {
            deltaMinor: 6_000,
            deltaFormatted: "+60",
            startTotal: "120",
            startTotalMinor: 12_000,
            endTotal: "180",
            endTotalMinor: 18_000,
          },
          recentIncrease: {
            deltaMinor: 6_000,
            deltaFormatted: "+60",
            startTotal: "120",
            startTotalMinor: 12_000,
            endTotal: "180",
            endTotalMinor: 18_000,
          },
          recentDecrease: null,
        },
      },
      "user-2": {
        userId: "user-2",
        firstName: "Amy",
        lastName: "Ace",
        displayName: "Amy Ace",
        color: "#f97316",
        rankTotal: "220",
        rankPosition: 2,
        rankGamesCount: 5,
        topThreeFinishes: 3,
        recentChangeSummary: {
          recentWindowLabel: "Last 30 days",
          startRankTotal: "220",
          startRankTotalMinor: 22_000,
          currentRankTotal: "220",
          currentRankTotalMinor: 22_000,
          netChange: null,
          recentIncrease: null,
          recentDecrease: null,
        },
      },
    },
    defaultSelectedUserIds: ["user-1", "user-2"],
    historyDateKeys: ["2026-06-16", "2026-06-17", "2026-06-18"],
  };
}

describe("PlayerRankPageView", () => {
  it("uses the highlighted user for the summary and chart interactions", () => {
    renderWithProviders(<PlayerRankPageView data={buildData()} />);

    expect(screen.getByText("Highlighted Player Rank")).toBeInTheDocument();
    expect(screen.getAllByText("Maya Viewer").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /^Highlight$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Filter$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("player-rank-series-user-2"));
    expect(screen.getAllByText("Amy Ace").length).toBeGreaterThan(0);
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /view profile/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("player-rank-avatar-user-1")).toHaveStyle({
      filter: "brightness(0.72) saturate(0.9)",
    });
    expect(screen.getByTestId("player-rank-avatar-user-2")).toHaveStyle({
      filter: "none",
    });

    fireEvent.click(screen.getByTestId("player-rank-avatar-user-1"));
    expect(screen.getAllByText("Maya Viewer").length).toBeGreaterThan(0);
    expect(screen.getByText("#1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Highlight$/i }));
    expect(
      screen.getByRole("button", { name: /close highlight drawer/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /amy ace 220 points/i }));
    expect(
      screen.queryByRole("button", { name: /close highlight drawer/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Amy Ace").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^Filter$/i }));
    expect(
      screen.getByRole("button", { name: /close filter drawer/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("checkbox")[1]!);

    expect(screen.queryByTestId("player-rank-series-user-2")).not.toBeInTheDocument();
    expect(screen.getAllByText("Maya Viewer").length).toBeGreaterThan(0);
    expect(screen.getByText("#1")).toBeInTheDocument();
  });
});
