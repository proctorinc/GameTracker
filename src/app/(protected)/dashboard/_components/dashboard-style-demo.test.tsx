import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/helpers/render";
import { describe, expect, it, vi } from "vitest";
import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import { DashboardStyleDemoView } from "./dashboard-style-demo";

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

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
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
    unopenedCardPacks: [],
    incomingInvitations: [
      {
        id: "invite-1",
        inviterId: "user-b",
        inviteeId: "user-a",
        kind: "friend",
        status: "pending",
        targetType: "user",
        inviteToken: null,
        tokenExpiresAt: null,
        respondedAt: null,
        createdAt: "2026-07-10T00:00:00.000Z",
        updatedAt: "2026-07-10T00:00:00.000Z",
        inviter: {
          id: "user-b",
          firstName: "Blair",
          lastName: "Beacon",
          color: "#22c55e",
          avatarUrl: null,
        },
      },
    ],
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
      {
        id: "title-2",
        title: "Lost Cities",
        color: "#7c2d12",
        imageUrl: "https://example.com/lost-cities.png",
        imageVerticalFocus: 50,
        timesPlayed: 3,
      },
    ],
    recentActiveGames: [
      {
        id: "active-1",
        createdAt: "2025-01-15T00:00:00.000Z",
        scoringMode: "lowest_wins",
        gameTitle: {
          title: "Skyjo",
          color: "#123456",
          imageUrl: "https://example.com/skyjo.png",
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
          color: "#123456",
          imageUrl: "https://example.com/skyjo.png",
          imageVerticalFocus: 50,
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
    ],
  } as DashboardPageData;
}

describe("DashboardStyleDemoView", () => {
  it("renders live dashboard data inside the treasure-map sandbox", () => {
    const { container } = renderWithProviders(
      <DashboardStyleDemoView data={createDashboardPageData()} />,
    );

    expect(
      screen.getByText(/the next game is somewhere beyond the ink/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Quest path")).toBeInTheDocument();
    expect(screen.getByText("Message scrolls")).toBeInTheDocument();
    expect(screen.getAllByText("Skyjo").length).toBeGreaterThan(0);
    expect(screen.getByText("Blair Beacon")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start a new game/i })).toHaveAttribute(
      "href",
      "/game/create/settings",
    );
    expect(screen.getByRole("button", { name: "Accept invitation" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Decline invitation" })).toBeEnabled();
    expect(screen.getByText("270")).toBeInTheDocument();
    expect(screen.getByText("One visual language, four field-tested surfaces.")).toBeInTheDocument();
    expect(screen.getByText("Captain’s Scroll")).toBeInTheDocument();
    expect(screen.getByText("Waypoint Map")).toBeInTheDocument();
    expect(screen.getByText("Quartermaster’s Case")).toBeInTheDocument();
    expect(screen.getByText("Fortune Card")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Lost Cities" })).toHaveAttribute(
      "href",
      "/titles/title-2",
    );
    expect(container.querySelector('[src^="/images/dashboard-demo/"]')).toBeNull();
    expect(screen.queryByText("Foliate frame")).not.toBeInTheDocument();
    expect(screen.queryByText("The Hollow")).not.toBeInTheDocument();
  });

  it("renders themed empty states without changing the dashboard data contract", () => {
    const data = createDashboardPageData();
    data.incomingInvitations = [];
    data.recentActiveGames = [];
    data.recentCompletedGames = [];
    data.recentGameTitles = [];

    renderWithProviders(<DashboardStyleDemoView data={data} />);

    expect(screen.getByText("No routes have been charted.")).toBeInTheDocument();
    expect(screen.getByText("No finished chronicles yet.")).toBeInTheDocument();
    expect(screen.getByText("No titles have reached the shelf.")).toBeInTheDocument();
    expect(screen.getByText("The scroll tube is empty.")).toBeInTheDocument();
  });
});
