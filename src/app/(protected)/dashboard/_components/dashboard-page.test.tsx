import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import { DashboardPageView } from "./dashboard-page";

vi.mock("@/components/game/rematch-button", () => ({
  RematchButton: () => <button type="button">Rematch</button>,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));
vi.mock("@/app/actions/friends", () => ({
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
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
    incomingInvitations: [],
    unopenedCardPacks: [],
    canViewPlayerRank: true,
    playerRankTotal: "270",
    playerRankPosition: 1,
    playerRankWindowLabel: "6-month rolling rank",
    playerRankGamesCount: 4,
    topThreeFinishes: 3,
    playerRankRecentChangeSummary: {
      recentWindowLabel: "Last 30 days",
      startRankTotal: "220",
      startRankTotalMinor: 22_000,
      currentRankTotal: "270",
      currentRankTotalMinor: 27_000,
      netChange: {
        deltaMinor: 5000,
        deltaFormatted: "+50",
        startTotal: "220",
        startTotalMinor: 22_000,
        endTotal: "270",
        endTotalMinor: 27_000,
      },
      recentIncrease: {
        deltaMinor: 5000,
        deltaFormatted: "+50",
        startTotal: "220",
        startTotalMinor: 22_000,
        endTotal: "270",
        endTotalMinor: 27_000,
      },
      recentDecrease: null,
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
        imageVerticalFocus: 50,
        timesPlayed: 6,
      },
    ],
    recentActiveGames: [
      {
        id: "active-1",
        createdAt: "2025-01-15T00:00:00.000Z",
        scoringMode: "lowest_wins",
        gameTitle: {
          title: "Skyjo",
          imageVerticalFocus: 50,
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
          imageVerticalFocus: 50,
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
    expect(markup).toContain("#1");
    expect(markup).toContain("Recent up");
    expect(markup).toContain("View full standings");
    expect(markup).toContain("Recent games");
    expect(markup).toContain("Continue Playing");
    expect(markup).toContain("Play");
    expect(markup).toContain("View library");
    expect(markup).toContain("/titles/played");
    expect(markup).toContain("12");
    expect(markup).toContain("28");
    expect(markup).toContain("Recent games");
    expect(markup).toContain("+50");
    expect(markup).toContain("1st");
    expect(markup).toContain("Rematch");
    expect(markup).toContain("2nd");
  });

  it("shows a compact unopened card pack summary", () => {
    const data = createDashboardPageData();
    data.unopenedCardPacks = [
      {
        deckName: "standard",
        deckLabel: "Standard",
        description: "Generic rewards",
        packCount: 2,
        cardsPerPack: 5,
      },
    ];

    const markup = renderToStaticMarkup(<DashboardPageView data={data} />);

    expect(markup).toContain("Packs ready to open");
    expect(markup).toContain("2 packs");
    expect(markup).toContain('href="/card/pull"');
    expect(markup).not.toContain("Generic rewards");
    expect(markup).not.toContain("5 cards each");
  });
});
