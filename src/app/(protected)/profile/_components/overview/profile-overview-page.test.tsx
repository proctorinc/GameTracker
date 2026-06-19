import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../../../../tests/helpers/render";
import { ProfileOverviewPage } from "./profile-overview-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("server-only", () => ({}));

describe("ProfileOverviewPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/profile");
  });

  it("opens the friends tab from deep links and highlights pending invitations", () => {
    window.localStorage.setItem("page-tab:/profile", "settings");
    window.history.replaceState({}, "", "/profile?tab=friends");

    const { container } = renderWithProviders(
      <ProfileOverviewPage
        initialData={{
          user: {
            id: "viewer",
            role: "user",
            firstName: "Maya",
            lastName: "Viewer",
            color: "#2563eb",
            createdAt: "2026-01-02T00:00:00.000Z",
          },
          profile: {
            id: "viewer",
            firstName: "Maya",
            lastName: "Viewer",
            color: "#2563eb",
            createdAt: "2026-01-02T00:00:00.000Z",
            displayName: "Maya Viewer",
          },
          canViewPlayerRank: false,
          playerRankTotal: null,
          playerRankPosition: null,
          playerRankWindowLabel: null,
          playerRankGamesCount: null,
          topThreeFinishes: null,
          twoPlayerPrizePool: null,
          threePlayerPrizePool: null,
          sixPlusPlayerPrizePool: null,
          defaultBestFriend: null,
          stats: {
            friendCount: 1,
            completedGames: 0,
            wins: 0,
            winRate: null,
            bestFriendGames: 0,
            bestWinStreak: 0,
            currentStreak: { type: null, count: 0 },
            storyline: {
              kind: "fresh",
              label: "Fresh start",
              detail: "No recent games yet.",
            },
            signatureTitle: null,
            lastPlayedAt: null,
          },
          comparisonOptions: [],
          comparisonSummariesByUserId: {},
          defaultComparisonUserId: null,
          socialData: {
            user: {
              id: "viewer",
              firstName: "Maya",
              lastName: "Viewer",
              color: "#2563eb",
              createdAt: "2026-01-02T00:00:00.000Z",
              role: "user",
            },
            friends: [],
            incomingInvitations: [
              {
                id: "invite-1",
                inviter: {
                  id: "friend-1",
                  firstName: "Amy",
                  lastName: "Ace",
                  color: "#22c55e",
                },
                invitee: null,
                targetType: "user",
                kind: "friend",
                status: "pending",
              },
            ],
            outgoingInvitations: [],
            recentlyPlayedWith: [],
            friendActivity: [],
          } as never,
          hasPendingFriendInvitations: true,
          showInviteNotice: true,
          initialTab: "friends",
        }}
      />,
    );

    expect(screen.getByText("Pending invitations need your review.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /friends/i }).length).toBeGreaterThan(0);
    expect(screen.getByText("Share")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /share your profile/i }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".bg-red-500")).toHaveLength(1);
    expect(window.localStorage.getItem("page-tab:/profile")).toBe("friends");
  });
});
