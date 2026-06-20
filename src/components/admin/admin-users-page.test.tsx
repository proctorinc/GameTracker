import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import { AdminUsersPage } from "./admin-users-page";

const { refresh, createAdminFriendship, mergeUsersAsAdmin, revokeAdminInvitation } =
  vi.hoisted(() => ({
    refresh: vi.fn(),
    createAdminFriendship: vi.fn(),
    mergeUsersAsAdmin: vi.fn(),
    revokeAdminInvitation: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/app/actions/admin", () => ({
  createAdminFriendship,
  mergeUsersAsAdmin,
  revokeAdminInvitation,
}));

function buildData() {
  return {
    users: [
      {
        id: "user-1",
        firstName: "Alex",
        lastName: "Admin",
        color: "#22c55e",
        role: "user" as const,
        isGuest: false,
        mergedIntoUserId: null,
        playerRankLeaderboardDisabled: false,
        createdAt: "2026-06-20T00:00:00.000Z",
      },
      {
        id: "user-2",
        firstName: "Bailey",
        lastName: "Buddy",
        color: "#f97316",
        role: "user" as const,
        isGuest: false,
        mergedIntoUserId: null,
        playerRankLeaderboardDisabled: false,
        createdAt: "2026-06-20T00:00:00.000Z",
      },
      {
        id: "guest-1",
        firstName: "Guest",
        lastName: "One",
        color: "#64748b",
        role: "user" as const,
        isGuest: true,
        mergedIntoUserId: null,
        playerRankLeaderboardDisabled: false,
        createdAt: "2026-06-20T00:00:00.000Z",
      },
    ],
    invitations: [
      {
        id: "invite-1",
        inviterUserId: "user-1",
        targetType: "user" as const,
        inviteeUserId: "user-2",
        inviteToken: null,
        guestUserId: null,
        kind: "friend" as const,
        status: "pending" as const,
        acceptedByUserId: null,
        acceptedAt: null,
        expiresAt: null,
        createdAt: "2026-06-20T01:00:00.000Z",
        updatedAt: "2026-06-20T01:00:00.000Z",
        inviter: {
          id: "user-1",
          firstName: "Alex",
          lastName: "Admin",
          color: "#22c55e",
        },
        invitee: {
          id: "user-2",
          firstName: "Bailey",
          lastName: "Buddy",
          color: "#f97316",
        },
        guestUser: null,
        acceptedBy: null,
      },
    ],
    friendships: [{ user1Id: "user-1", user2Id: "user-2" }],
  };
}

describe("AdminUsersPage", () => {
  it("shows an explicit already-friends state and disables direct friending", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage data={buildData()} />);

    const combos = screen.getAllByRole("combobox");
    await user.click(combos[0]!);
    await user.click(screen.getAllByText("Alex Admin").at(-1)!);
    await user.click(combos[1]!);
    await user.click(screen.getAllByText("Bailey Buddy").at(-1)!);

    expect(screen.getByText("Already friends")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add friends/i }),
    ).toBeDisabled();
  });

  it("revokes a pending invitation from the admin list", async () => {
    revokeAdminInvitation.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage data={buildData()} />);

    await user.click(screen.getByRole("button", { name: /revoke/i }));

    await waitFor(() =>
      expect(revokeAdminInvitation).toHaveBeenCalledWith({
        invitationId: "invite-1",
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("allows a guest source to merge into a target account", async () => {
    mergeUsersAsAdmin.mockResolvedValue({
      mergedGamePlayerCount: 1,
      deletedDuplicateGamePlayerCount: 0,
    });
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage data={buildData()} />);

    const combos = screen.getAllByRole("combobox");
    await user.click(combos[0]!);
    await user.click(screen.getAllByText("Guest One").at(-1)!);
    await user.click(combos[1]!);
    await user.click(screen.getAllByText("Alex Admin").at(-1)!);
    await user.click(screen.getByRole("button", { name: /merge source into target/i }));

    await waitFor(() =>
      expect(mergeUsersAsAdmin).toHaveBeenCalledWith({
        sourceUserId: "guest-1",
        targetUserId: "user-1",
      }),
    );
  });
});
