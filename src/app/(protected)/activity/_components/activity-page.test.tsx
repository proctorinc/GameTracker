import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../../../tests/helpers/render";
import { ActivityPageView } from "./activity-page";
import type { ActivityPageData } from "./page-data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

function createActivityPageData(
  leaderboardFriends: ActivityPageData["leaderboardFriends"],
): ActivityPageData {
  return {
    user: {
      id: "viewer",
      firstName: "Maya",
      lastName: "Viewer",
      color: "#ffffff",
      playerRankLeaderboardDisabled: false,
    },
    friends: [],
    friendActivity: [
      {
        id: "game-1",
        createdAt: "2026-06-17T10:00:00.000Z",
        completedAt: "2026-06-17T10:00:00.000Z",
        gameTitle: {
          id: "title-1",
          title: "Skyjo",
          color: "#123456",
          imageUrl: null,
        },
        players: [
          {
            id: "player-1",
            gameId: "game-1",
            userId: "viewer",
            score: 14,
            user: {
              id: "viewer",
              firstName: "Maya",
              lastName: "Viewer",
              color: "#ffffff",
            },
          },
        ],
        winners: [],
        rounds: [],
        creator: {
          id: "viewer",
          firstName: "Maya",
          lastName: "Viewer",
          color: "#ffffff",
        },
        cardDrops: [],
        scoringMode: "lowest_wins",
        creatorId: "viewer",
        gameTitleId: "title-1",
        version: "v1",
        endingMode: "none",
        trackRounds: false,
        targetRounds: null,
        scoreThreshold: null,
        scoreThresholdDirection: null,
        completedRounds: 1,
        currentUserRankDelta: {
          gameId: "game-1",
          userId: "viewer",
          deltaMinor: 4000,
          deltaFormatted: "+40",
          completedAt: "2026-06-17T10:00:00.000Z",
        },
      },
    ],
    leaderboardFriends,
    playerRankTrend: {
      rankTotal: "180",
      rankPosition: 3,
      windowLabel: "6-month rolling rank",
      chartPoints: [
        {
          historyDate: "2026-06-15",
          hasSnapshot: true,
          playerRankPosition: 4,
          playerRankTotal: "140",
          playerRankTotalMinor: 14_000,
          playerRankGamesCount: 3,
          topThreeFinishes: 2,
        },
        {
          historyDate: "2026-06-16",
          hasSnapshot: true,
          playerRankPosition: 4,
          playerRankTotal: "140",
          playerRankTotalMinor: 14_000,
          playerRankGamesCount: 3,
          topThreeFinishes: 2,
        },
        {
          historyDate: "2026-06-17",
          hasSnapshot: true,
          playerRankPosition: 3,
          playerRankTotal: "180",
          playerRankTotalMinor: 18_000,
          playerRankGamesCount: 4,
          topThreeFinishes: 3,
        },
      ],
      hasHistory: true,
    },
  };
}

describe("ActivityPageView", () => {
  it("renders a podium in 3rd, 1st, 2nd visual order with avatar-only profile links", () => {
    renderWithProviders(
      <ActivityPageView
        data={createActivityPageData([
          {
            user: {
              id: "friend-1",
              firstName: "Amy",
              lastName: "Ace",
              color: "#22c55e",
            },
            isCurrentUser: false,
            friendPosition: 1,
            playerRankTotal: "220",
            playerRankTotalMinor: 22_000,
            globalPosition: 4,
            playerRankWindowLabel: "6-month rolling rank",
            playerRankGamesCount: 5,
            topThreeFinishes: 3,
            recentRankedGameAt: "2026-06-17T10:00:00.000Z",
            recentActivityCount: 3,
            headlineStat: {
              kind: "rank",
              label: "+150 in the last week",
            },
            supportingStats: ["Won 3 of last 3", "3 games this week"],
          },
          {
            user: {
              id: "friend-2",
              firstName: "Paul",
              lastName: "Played",
              color: "#f97316",
            },
            isCurrentUser: false,
            friendPosition: 2,
            playerRankTotal: "140",
            playerRankTotalMinor: 14_000,
            globalPosition: 7,
            playerRankWindowLabel: "6-month rolling rank",
            playerRankGamesCount: 2,
            topThreeFinishes: 1,
            recentRankedGameAt: "2026-06-15T10:00:00.000Z",
            recentActivityCount: 2,
            headlineStat: {
              kind: "volume",
              label: "2 games in the last 3 days",
            },
            supportingStats: ["2 games this week"],
          },
          {
            user: {
              id: "friend-3",
              firstName: "Nora",
              lastName: "Newbie",
              color: "#94a3b8",
            },
            isCurrentUser: false,
            friendPosition: 3,
            playerRankTotal: "120",
            playerRankTotalMinor: 12_000,
            globalPosition: 9,
            playerRankWindowLabel: "6-month rolling rank",
            playerRankGamesCount: 3,
            topThreeFinishes: 1,
            recentRankedGameAt: "2026-06-13T10:00:00.000Z",
            recentActivityCount: 1,
            headlineStat: {
              kind: "wins",
              label: "Won 2 of last 3",
            },
            supportingStats: ["Last played 5 days ago"],
          },
          {
            user: {
              id: "friend-4",
              firstName: "Quinn",
              lastName: "Fourth",
              color: "#38bdf8",
            },
            isCurrentUser: false,
            friendPosition: 4,
            playerRankTotal: "90",
            playerRankTotalMinor: 9_000,
            globalPosition: 12,
            playerRankWindowLabel: "6-month rolling rank",
            playerRankGamesCount: 1,
            topThreeFinishes: 0,
            recentRankedGameAt: "2026-06-10T10:00:00.000Z",
            recentActivityCount: 1,
            headlineStat: {
              kind: "volume",
              label: "1 game in the last 2 weeks",
            },
            supportingStats: ["Last played 8 days ago"],
          },
          {
            user: {
              id: "friend-5",
              firstName: "Zara",
              lastName: "Zero",
              color: "#64748b",
            },
            isCurrentUser: false,
            friendPosition: 5,
            playerRankTotal: "0",
            playerRankTotalMinor: 0,
            globalPosition: null,
            playerRankWindowLabel: null,
            playerRankGamesCount: 0,
            topThreeFinishes: 0,
            recentRankedGameAt: null,
            recentActivityCount: 0,
            headlineStat: {
              kind: "idle",
              label: "No recent activity",
            },
            supportingStats: [],
          },
        ])}
      />,
    );

    expect(screen.getByRole("button", { name: /activity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /leaderboard/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /leaderboard/i }));

    expect(screen.getByRole("heading", { name: "Player Rank" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /your player rank/i })).toHaveAttribute(
      "href",
      "/player-rank",
    );

    const podium = screen.getByLabelText("Leaderboard podium");
    expect(
      within(podium)
        .getAllByLabelText(/place /i)
        .map((card) => card.getAttribute("aria-label")),
    ).toEqual([
      "3rd place Nora N.",
      "1st place Amy A.",
      "2nd place Paul P.",
    ]);

    expect(within(podium).getByText("Amy A.")).toBeInTheDocument();
    expect(within(podium).getByText("Paul P.")).toBeInTheDocument();
    expect(within(podium).getByText("Nora N.")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "View Amy Ace's profile" })
        .some((link) => link.getAttribute("href") === "/profile/friend-1"),
    ).toBe(true);

    const quinnButton = screen.getByRole("button", { name: "Quinn F." });
    expect(screen.getByText("Quinn F.")).toBeInTheDocument();
    expect(screen.getByText("Zara Z.")).toBeInTheDocument();
    expect(screen.getByText("No Activity")).toBeInTheDocument();
    expect(within(quinnButton).getByText("#4")).toBeInTheDocument();
    expect(within(podium).getAllByText("Amy A.").length).toBeGreaterThan(0);
  });

  it("renders a centered gold podium card when only one leaderboard user exists", () => {
    renderWithProviders(
      <ActivityPageView
        data={createActivityPageData([
          {
            user: {
              id: "friend-1",
              firstName: "Solo",
              lastName: "Star",
              color: "#22c55e",
            },
            isCurrentUser: false,
            friendPosition: 1,
            playerRankTotal: "220",
            playerRankTotalMinor: 22_000,
            globalPosition: 4,
            playerRankWindowLabel: "6-month rolling rank",
            playerRankGamesCount: 5,
            topThreeFinishes: 3,
            recentRankedGameAt: "2026-06-17T10:00:00.000Z",
            recentActivityCount: 3,
            headlineStat: {
              kind: "rank",
              label: "+150 in the last week",
            },
            supportingStats: ["Won 3 of last 3"],
          },
        ])}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /leaderboard/i }));

    const podium = screen.getByLabelText("Leaderboard podium");
    expect(within(podium).getAllByLabelText(/place /i)).toHaveLength(1);
    expect(within(podium).getByLabelText("1st place Solo S.")).toBeInTheDocument();
  });

  it("renders gold and silver podium cards when exactly two leaderboard users exist", () => {
    renderWithProviders(
      <ActivityPageView
        data={createActivityPageData([
          {
            user: {
              id: "friend-1",
              firstName: "Goldie",
              lastName: "First",
              color: "#22c55e",
            },
            isCurrentUser: false,
            friendPosition: 1,
            playerRankTotal: "220",
            playerRankTotalMinor: 22_000,
            globalPosition: 4,
            playerRankWindowLabel: "6-month rolling rank",
            playerRankGamesCount: 5,
            topThreeFinishes: 3,
            recentRankedGameAt: "2026-06-17T10:00:00.000Z",
            recentActivityCount: 3,
            headlineStat: {
              kind: "rank",
              label: "+150 in the last week",
            },
            supportingStats: [],
          },
          {
            user: {
              id: "friend-2",
              firstName: "Silver",
              lastName: "Second",
              color: "#f97316",
            },
            isCurrentUser: false,
            friendPosition: 2,
            playerRankTotal: "140",
            playerRankTotalMinor: 14_000,
            globalPosition: 7,
            playerRankWindowLabel: "6-month rolling rank",
            playerRankGamesCount: 2,
            topThreeFinishes: 1,
            recentRankedGameAt: "2026-06-15T10:00:00.000Z",
            recentActivityCount: 2,
            headlineStat: {
              kind: "volume",
              label: "2 games in the last 3 days",
            },
            supportingStats: [],
          },
        ])}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /leaderboard/i }));

    const podium = screen.getByLabelText("Leaderboard podium");
    expect(
      within(podium)
        .getAllByLabelText(/place /i)
        .map((card) => card.getAttribute("aria-label")),
    ).toEqual(["1st place Goldie F.", "2nd place Silver S."]);
  });
});
