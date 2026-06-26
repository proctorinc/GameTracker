"use client";

import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../../tests/helpers/render";
import { RecentlyPlayedCard } from "./recently-played-card";

const useFriendsPageMock = vi.fn();

vi.mock("../friends-page-provider", () => ({
  useFriendsPage: () => useFriendsPageMock(),
}));

function buildEntry(input: {
  id: string;
  firstName: string;
  isGuest: boolean;
  createdByUserId?: string | null;
}) {
  return {
    user: {
      id: input.id,
      firstName: input.firstName,
      lastName: "User",
      color: "#3366FF",
      isGuest: input.isGuest,
      created_by_user_id: input.createdByUserId ?? null,
    },
    lastPlayedAt: null,
    pendingInvitation: null,
  };
}

describe("RecentlyPlayedCard", () => {
  it("opens guest share from the owned guest avatar", async () => {
    const openGuestShareDrawer = vi.fn();
    const entry = buildEntry({
      id: "guest-owned",
      firstName: "Guest",
      isGuest: true,
      createdByUserId: "viewer",
    });

    useFriendsPageMock.mockReturnValue({
      data: {
        user: { id: "viewer" },
        recentlyPlayedWith: [entry],
      },
      isPending: false,
      openGuestShareDrawer,
      showAllRecentlyPlayed: false,
      toggleShowAllRecentlyPlayed: vi.fn(),
      visibleRecentlyPlayed: [entry],
      handleQuickInviteUser: vi.fn(),
      handleReshareInvitation: vi.fn(),
    });

    renderWithProviders(<RecentlyPlayedCard />);
    await userEvent.click(
      screen.getByRole("button", { name: "Share claim link for Guest User" }),
    );

    expect(openGuestShareDrawer).toHaveBeenCalledWith(entry);
  });

  it("does not show guest-share affordances for guests you do not own", () => {
    const entry = buildEntry({
      id: "guest-other",
      firstName: "Other",
      isGuest: true,
      createdByUserId: "someone-else",
    });

    useFriendsPageMock.mockReturnValue({
      data: {
        user: { id: "viewer" },
        recentlyPlayedWith: [entry],
      },
      isPending: false,
      openGuestShareDrawer: vi.fn(),
      showAllRecentlyPlayed: false,
      toggleShowAllRecentlyPlayed: vi.fn(),
      visibleRecentlyPlayed: [entry],
      handleQuickInviteUser: vi.fn(),
      handleReshareInvitation: vi.fn(),
    });

    renderWithProviders(<RecentlyPlayedCard />);

    expect(
      screen.queryByRole("button", { name: "Share claim link for Other User" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open guest claim share" }),
    ).not.toBeInTheDocument();
  });
});
