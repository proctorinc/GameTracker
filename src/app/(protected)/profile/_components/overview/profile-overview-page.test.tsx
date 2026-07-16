import { fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../../../../tests/helpers/render";
import { ProfileOverviewPage } from "./profile-overview-page";

vi.mock("@/components/profile/friend-invite-share-card", () => ({
  FriendInviteShareCard: () => <div>Invite friends</div>,
  FriendInviteSharePanel: () => <div>Invite friends panel</div>,
}));

vi.mock("@clerk/nextjs", () => ({
  SignOutButton: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
    setTheme: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
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
          cardsEnabled: false,
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
            placements: { first: 0, second: 0, third: 0 },
            rankWindowLabel: "Window rank gain",
            rankGainInWindow: { formatted: "0", minor: 0 },
            rankGainAllTime: { formatted: "0", minor: 0 },
            bestRankGain: null,
            averageRankGain: null,
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
    expect(screen.queryByRole("button", { name: "Cards" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /friends/i }).length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".bg-red-500")).toHaveLength(1);
    expect(window.localStorage.getItem("page-tab:/profile")).toBe("friends");
  });

  it("guarantees a settings deep link overrides remembered and server tab state", () => {
    window.localStorage.setItem("page-tab:/profile", "friends");
    window.history.replaceState({}, "", "/profile?tab=settings");

    renderWithProviders(
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
          playerRankRecentChangeSummary: null,
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
            placements: { first: 0, second: 0, third: 0 },
            rankWindowLabel: "Window rank gain",
            rankGainInWindow: { formatted: "0", minor: 0 },
            rankGainAllTime: { formatted: "0", minor: 0 },
            bestRankGain: null,
            averageRankGain: null,
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
            incomingInvitations: [],
            outgoingInvitations: [],
            recentlyPlayedWith: [],
            friendActivity: [],
          } as never,
          hasPendingFriendInvitations: false,
          showInviteNotice: false,
          initialTab: "stats",
        }}
      />,
    );

    const settingsButton = screen.getByRole("button", {
      name: /profile settings/i,
    });

    expect(screen.getByText("Edit Profile")).toBeInTheDocument();

    fireEvent.click(settingsButton);

    expect(screen.queryByText("Edit Profile")).not.toBeInTheDocument();
    expect(screen.getByText("Fresh start")).toBeInTheDocument();
    expect(window.localStorage.getItem("page-tab:/profile")).toBe("stats");

    fireEvent.click(settingsButton);

    expect(screen.getByText("Edit Profile")).toBeInTheDocument();
    expect(window.localStorage.getItem("page-tab:/profile")).toBe("stats");
  });

  it("treats a previously saved settings tab as stats", () => {
    window.localStorage.setItem("page-tab:/profile", "settings");

    renderWithProviders(
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
          playerRankRecentChangeSummary: null,
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
            placements: { first: 0, second: 0, third: 0 },
            rankWindowLabel: "Window rank gain",
            rankGainInWindow: { formatted: "0", minor: 0 },
            rankGainAllTime: { formatted: "0", minor: 0 },
            bestRankGain: null,
            averageRankGain: null,
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
            incomingInvitations: [],
            outgoingInvitations: [],
            recentlyPlayedWith: [],
            friendActivity: [],
          } as never,
          hasPendingFriendInvitations: false,
          showInviteNotice: false,
          initialTab: "stats",
        }}
      />,
    );

    expect(screen.queryByText("Edit Profile")).not.toBeInTheDocument();
    expect(screen.getByText("Fresh start")).toBeInTheDocument();
    expect(window.localStorage.getItem("page-tab:/profile")).toBe("stats");
  });
});
