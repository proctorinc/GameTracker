import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../../../tests/helpers/render";
import { ActivityPageView } from "./activity-page";
import type { ActivityPageData } from "./page-data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("ActivityPageView", () => {
  it("renders the activity and leaderboard tabs and groups no-score friends under no activity", () => {
    renderWithProviders(
      <ActivityPageView
        data={{
          user: {
            id: "viewer",
            firstName: "Maya",
            lastName: "Viewer",
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
          leaderboardFriends: [
            {
              user: {
                id: "friend-1",
                firstName: "Amy",
                lastName: "Ace",
                color: "#22c55e",
              },
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
              supportingStats: [
                "Won 3 of last 3",
                "3 games this week",
              ],
            },
            {
              user: {
                id: "friend-2",
                firstName: "Paul",
                lastName: "Played",
                color: "#f97316",
              },
              friendPosition: 2,
              playerRankTotal: "0",
              playerRankTotalMinor: 0,
              globalPosition: null,
              playerRankWindowLabel: "6-month rolling rank",
              playerRankGamesCount: 2,
              topThreeFinishes: 0,
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
              friendPosition: 3,
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
          ],
        } as ActivityPageData}
      />,
    );

    expect(screen.getByRole("button", { name: /activity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /leaderboard/i })).toBeInTheDocument();
    expect(screen.getByText("+40 Rank")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /leaderboard/i }));

    expect(screen.getByText("Amy Ace")).toBeInTheDocument();
    expect(screen.getByText("Paul Played")).toBeInTheDocument();
    expect(screen.getByText("Nora Newbie")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Amy Ace's profile" }),
    ).toHaveAttribute("href", "/profile/friend-1");
    expect(screen.getByText("220")).toBeInTheDocument();
    expect(screen.getByText("+150 in the last week")).toBeInTheDocument();
    expect(screen.getByText("2 games in the last 3 days")).toBeInTheDocument();
    expect(screen.getByText("No Activity")).toBeInTheDocument();
    expect(screen.getByText("--")).toBeInTheDocument();
    expect(screen.queryByText("No recent activity")).not.toBeInTheDocument();
    expect(screen.queryByText("Climbing fast")).not.toBeInTheDocument();
    expect(screen.queryByText("Playing, not cashing")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /amy ace/i }));

    expect(
      screen
        .getAllByRole("link", { name: "View Profile" })
        .some((link) => link.getAttribute("href") === "/profile/friend-1"),
    ).toBe(true);
    expect(screen.getByText("#4")).toBeInTheDocument();
    expect(screen.getByText("Won 3 of last 3")).toBeInTheDocument();
    expect(screen.getByText("3 games this week")).toBeInTheDocument();
  });
});
