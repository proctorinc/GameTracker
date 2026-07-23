import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../../../tests/helpers/render";
import type { ProfileStatsOverallComparisonStats } from "@/lib/profile-stats";
import { ProfileStatsSections } from "./profile-stats-sections";
import type { ProfileStatsPageData } from "../profile-types";

function createOverallStats(
  overrides: Partial<ProfileStatsOverallComparisonStats> = {},
): ProfileStatsOverallComparisonStats {
  return {
    completedGames: 0,
    wins: 0,
    winRate: null,
    currentStreak: { type: null, count: 0 },
    bestWinStreak: 0,
    signatureTitle: null,
    lastPlayedAt: null,
    placements: { first: 0, second: 0, third: 0 },
    rankWindowLabel: "6-month rank gain",
    rankGainInWindow: { formatted: "0", minor: 0 },
    rankGainAllTime: { formatted: "0", minor: 0 },
    bestRankGain: null,
    averageRankGain: null,
    currentGlobalRankTotal: null,
    currentGlobalRankPosition: null,
    ...overrides,
  };
}

describe("ProfileStatsSections comparison modes", () => {
  it("defaults to shared games and switches to independent all-time stats", async () => {
    const user = userEvent.setup();
    const rival = {
      id: "user-2",
      firstName: "Riley",
      lastName: "Rival",
      color: "#f97316",
      avatarUrl: null,
      displayName: "Riley Rival",
      isGuest: false,
    };
    const data: ProfileStatsPageData = {
      profile: {
        id: "user-1",
        firstName: "Maya",
        lastName: "Player",
        color: "#2563eb",
        avatarUrl: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        displayName: "Maya Player",
      },
      canViewPlayerRank: false,
      playerRankTotal: null,
      playerRankPosition: null,
      playerRankWindowLabel: null,
      playerRankGamesCount: null,
      topThreeFinishes: null,
      playerRankRecentChangeSummary: null,
      twoPlayerPrizePool: null,
      threePlayerPrizePool: null,
      sixPlusPlayerPrizePool: null,
      defaultBestFriend: {
        ...rival,
        completedGamesTogether: 5,
        lastPlayedAt: "2026-06-01T00:00:00.000Z",
      },
      stats: {
        completedGames: 20,
        wins: 8,
        winRate: 40,
        friendCount: 1,
        lastPlayedAt: "2026-06-01T00:00:00.000Z",
        currentStreak: { type: "win", count: 2 },
        bestWinStreak: 4,
        bestFriendGames: 5,
        storyline: { kind: "steady", label: "Steady", detail: "Playing on." },
        signatureTitle: {
          id: "title-1",
          title: "Lost Cities",
          color: "#0f766e",
          imageUrl: "/lost-cities.jpg",
          imageVerticalFocus: 50,
          completedCount: 7,
          winRate: 57,
          lastPlayedAt: "2026-06-01T00:00:00.000Z",
        },
        placements: { first: 8, second: 6, third: 3 },
        rankWindowLabel: "6-month rank gain",
        rankGainInWindow: { formatted: "+40", minor: 4000 },
        rankGainAllTime: { formatted: "+90", minor: 9000 },
        bestRankGain: { formatted: "+15", minor: 1500 },
        averageRankGain: { formatted: "+4", minor: 450 },
      },
      comparisonOptions: [rival],
      comparisonSummariesByUserId: {
        "user-2": {
          user: rival,
          headToHeadStats: {
            profile: createOverallStats({ completedGames: 5, wins: 3, winRate: 60 }),
            comparison: createOverallStats({ completedGames: 5, wins: 2, winRate: 40 }),
          },
          completedGamesTogether: 5,
          wins: 3,
          losses: 2,
          winRate: 60,
          currentStreak: { type: "win", count: 1 },
          favoriteSharedTitle: null,
          lastPlayedAt: "2026-06-01T00:00:00.000Z",
          recentWins: 3,
          recentGamesCount: 4,
          overallStats: createOverallStats({
            completedGames: 12,
            wins: 4,
            winRate: 33,
          }),
        },
      },
      defaultComparisonUserId: "user-2",
    };

    const { container } = renderWithProviders(
      <ProfileStatsSections data={data} />,
    );

    expect(container.querySelectorAll("[data-stat-icon]")).toHaveLength(5);
    expect(container.querySelectorAll("[data-stat-icon-shine]")).toHaveLength(
      5,
    );
    expect(
      screen.getByRole("link", { name: "View Lost Cities stats" }),
    ).toHaveStyle("--game-title-color: #0f766e");
    expect(screen.getByText("Favorite game")).toBeInTheDocument();
    expect(screen.queryByText("Matchups")).not.toBeInTheDocument();
    expect(
      container.querySelector("[data-stat-grid]")?.firstElementChild,
    ).toHaveAttribute("data-favorite-game-card");

    expect(screen.getByRole("tab", { name: "Head to head" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const headToHeadWins = screen.getAllByText("Wins").at(-1)?.parentElement
      ?.parentElement;
    expect(headToHeadWins).not.toBeNull();
    expect(within(headToHeadWins!).getByText("3")).toBeInTheDocument();
    expect(within(headToHeadWins!).getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3-2")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "All games" }));

    expect(screen.getByRole("tab", { name: "All games" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const allTimeWins = screen.getAllByText("Wins").at(-1)?.parentElement
      ?.parentElement;
    expect(allTimeWins).not.toBeNull();
    expect(within(allTimeWins!).getByText("8")).toBeInTheDocument();
    expect(within(allTimeWins!).getByText("4")).toBeInTheDocument();
    expect(screen.queryByText("3-2")).not.toBeInTheDocument();
  });
});
