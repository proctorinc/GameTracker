import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import { DashboardPageView } from "./dashboard-page";

function createDashboardPageData(): DashboardPageData {
  return {
    user: {
      id: "user-a",
      profileCardId: null,
      color: "#ffffff",
      phoneNumber: "15555551111",
      firstName: "Alex",
      lastName: "Avery",
      phone_verified_at: null,
      created_by_user_id: null,
      isProfileComplete: true,
      isGuest: false,
      createdAt: null,
      updatedAt: null,
      activeProfileCard: null,
      createdBy: null,
      cards: [],
      sessions: [],
      cardDrops: [],
      gamePlayers: [],
      createdGames: [],
      friendshipsAsUser1: [],
      friendshipsAsUser2: [],
    },
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
        gameTitle: {
          title: "Skyjo",
        },
        players: [
          {
            id: "player-1",
            gameId: "active-1",
            user: {
              id: "user-a",
              firstName: "Alex",
              color: "#ffffff",
            },
          },
          {
            id: "player-2",
            gameId: "active-1",
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
        gameTitle: {
          title: "Skyjo",
        },
        players: [
          {
            id: "player-3",
            gameId: "completed-1",
            user: {
              id: "user-a",
              firstName: "Alex",
              color: "#ffffff",
            },
          },
          {
            id: "player-4",
            gameId: "completed-1",
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
      },
      {
        id: "completed-2",
        completedAt: "2025-01-17T00:00:00.000Z",
        gameTitle: {
          title: "Skyjo Classic",
        },
        players: [
          {
            id: "player-5",
            gameId: "completed-2",
            user: {
              id: "user-a",
              firstName: "Alex",
              color: "#ffffff",
            },
          },
          {
            id: "player-6",
            gameId: "completed-2",
            user: {
              id: "user-d",
              firstName: "Drew",
              color: "#ff00ff",
            },
          },
        ],
        winners: [],
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
    expect(markup).toContain("Recently played");
    expect(markup).toContain("History");
    expect(markup).toContain("Continue Playing");
    expect(markup).toContain("Me, Blair");
    expect(markup).toContain("Completed games");
    expect(markup).toContain("Casey");
    expect(markup).toContain("won");
    expect(markup).toContain("Me, Drew");
  });
});
