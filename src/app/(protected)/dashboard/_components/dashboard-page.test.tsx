import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import { DashboardPageView } from "./dashboard-page";

vi.mock("@/components/game/rematch-button", () => ({
  RematchButton: () => <button type="button">Rematch</button>,
}));
vi.mock("@/lib/use-page-auto-refresh", () => ({
  usePageAutoRefresh: () => undefined,
}));

function createDashboardPageData(): DashboardPageData {
  return {
    user: {
      id: "user-a",
      clerkUserId: null,
      profileCardId: null,
      color: "#ffffff",
      role: "user",
      email: null,
      avatarUrl: null,
      firstName: "Alex",
      lastName: "Avery",
      created_by_user_id: null,
      mergedIntoUserId: null,
      mergedAt: null,
      isProfileComplete: true,
      isGuest: false,
      playerRankLeaderboardDisabled: false,
      createdAt: null,
      updatedAt: null,
      activeProfileCard: null,
      createdBy: null,
      cards: [],
      cardDrops: [],
      gamePlayers: [],
      createdGames: [],
      friendshipsAsUser1: [],
      friendshipsAsUser2: [],
    },
    canViewPlayerRank: true,
    playerRankTotal: "270",
    playerRankPosition: 2,
    playerRankWindowLabel: "6-month rolling rank",
    playerRankGamesCount: 4,
    topThreeFinishes: 3,
    playerRankRecentChangeSummary: {
      recentWindowLabel: "Last 30 days",
      recentGamesCount: 2,
      latestChange: {
        gameId: "completed-1",
        userId: "user-a",
        deltaMinor: 5000,
        deltaFormatted: "+50",
        completedAt: "2025-01-16T00:00:00.000Z",
      },
      latestIncrease: {
        gameId: "completed-1",
        userId: "user-a",
        deltaMinor: 5000,
        deltaFormatted: "+50",
        completedAt: "2025-01-16T00:00:00.000Z",
      },
      latestDecrease: null,
    },
    twoPlayerPrizePool: "50",
    threePlayerPrizePool: "100",
    sixPlusPlayerPrizePool: "400",
    recentGameTitles: [
      {
        id: "title-1",
        title: "Skyjo",
        color: "#123456",
        imageUrl: "https://example.com/skyjo.png",
      },
    ],
    recentActiveGames: [
      {
        id: "active-1",
        createdAt: "2025-01-15T00:00:00.000Z",
        scoringMode: "lowest_wins",
        gameTitle: {
          title: "Skyjo",
        },
        players: [
          {
            id: "player-1",
            gameId: "active-1",
            userId: "user-a",
            score: 12,
            user: {
              id: "user-a",
              firstName: "Alex",
              color: "#ffffff",
            },
          },
          {
            id: "player-2",
            gameId: "active-1",
            userId: "user-b",
            score: 28,
            user: {
              id: "user-b",
              firstName: "Blair",
              color: "#000000",
            },
          },
        ],
      },
    ],
    recentCompletedGames: [
      {
        id: "completed-1",
        completedAt: "2025-01-16T00:00:00.000Z",
        scoringMode: "lowest_wins",
        gameTitle: {
          title: "Skyjo",
        },
        players: [
          {
            id: "player-3",
            gameId: "completed-1",
            userId: "user-a",
            score: 18,
            user: {
              id: "user-a",
              firstName: "Alex",
              color: "#ffffff",
            },
          },
          {
            id: "player-4",
            gameId: "completed-1",
            userId: "user-c",
            score: 24,
            user: {
              id: "user-c",
              firstName: "Casey",
              color: "#00ff00",
            },
          },
        ],
        winners: [
          {
            userId: "user-c",
            user: {
              id: "user-c",
              firstName: "Casey",
              color: "#00ff00",
            },
          },
        ],
        currentUserRankDelta: {
          gameId: "completed-1",
          userId: "user-a",
          deltaMinor: 5000,
          deltaFormatted: "+50",
          completedAt: "2025-01-16T00:00:00.000Z",
        },
      },
      {
        id: "completed-2",
        completedAt: "2025-01-17T00:00:00.000Z",
        scoringMode: "lowest_wins",
        gameTitle: {
          title: "Skyjo Classic",
        },
        players: [
          {
            id: "player-5",
            gameId: "completed-2",
            userId: "user-a",
            score: 31,
            user: {
              id: "user-a",
              firstName: "Alex",
              color: "#ffffff",
            },
          },
          {
            id: "player-6",
            gameId: "completed-2",
            userId: "user-d",
            score: 12,
            user: {
              id: "user-d",
              firstName: "Drew",
              color: "#ff00ff",
            },
          },
        ],
        winners: [],
        currentUserRankDelta: null,
      },
    ],
  } as DashboardPageData;
}

describe("DashboardPageView", () => {
  it("renders the dashboard sections from the page data contract", () => {
    const markup = renderToStaticMarkup(
      <DashboardPageView data={createDashboardPageData()} />,
    );

    expect(markup).toContain("Hi, Alex!");
    expect(markup).toContain("Player Rank");
    expect(markup).toContain("#2");
    expect(markup).toContain("Recent up");
    expect(markup).toContain("View full standings");
    expect(markup).toContain("History");
    expect(markup).toContain("Continue Playing");
    expect(markup).toContain("Play");
    expect(markup).toContain("12");
    expect(markup).toContain("28");
    expect(markup).toContain("Recent games");
    expect(markup).toContain("+50 Rank");
    expect(markup).toContain("1st");
    expect(markup).toContain("Rematch");
    expect(markup).toContain("2nd");
  });
});
