import { renderWithProviders } from "../../../tests/helpers/render";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminPlayerRanks } from "./admin-player-ranks";

const {
  forceRefreshAllPlayerRankHistory,
  refresh,
  setPlayerRankLeaderboardDisabled,
} = vi.hoisted(() => ({
  forceRefreshAllPlayerRankHistory: vi.fn(),
  refresh: vi.fn(),
  setPlayerRankLeaderboardDisabled: vi.fn(),
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

vi.mock("@/app/actions/player-rank", () => ({
  backfillPlayerRankHistory: vi.fn(),
  forceRefreshAllPlayerRankHistory,
  generatePlayerRankPreview: vi.fn(),
  publishPlayerRankSettings: vi.fn(),
  setPlayerRankLeaderboardDisabled,
}));

describe("AdminPlayerRanks", () => {
  it("lets admins force rebuild all player rank history", async () => {
    forceRefreshAllPlayerRankHistory.mockResolvedValue({
      startDate: "2026-06-01",
      endDate: "2026-06-19",
      rebuiltDayCount: 19,
      writtenSnapshotCount: 12,
    });
    const user = userEvent.setup();

    renderWithProviders(
      <AdminPlayerRanks
        activeConfig={{
          id: "config-1",
          windowMonths: 6,
          defaultMaxPrizePool: 40000,
          prizePoolByPlayerCount: {
            2: 5000,
            3: 10000,
            4: 20000,
            5: 30000,
          },
          smallGameDistribution: {
            2: [10000, 0, 0],
            3: [10000, 0, 0],
          },
          largeGameDistribution: [6000, 3000, 1000],
        }}
        standings={[]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Force rebuild all history" }),
    );

    await waitFor(() =>
      expect(forceRefreshAllPlayerRankHistory).toHaveBeenCalled(),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("renders a compact leaderboard list and updates excluded status from the toggle", async () => {
    setPlayerRankLeaderboardDisabled.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(
      <AdminPlayerRanks
        activeConfig={{
          id: "config-1",
          windowMonths: 6,
          defaultMaxPrizePool: 40000,
          prizePoolByPlayerCount: {
            2: 5000,
            3: 10000,
            4: 20000,
            5: 30000,
          },
          smallGameDistribution: {
            2: [10000, 0, 0],
            3: [10000, 0, 0],
          },
          largeGameDistribution: [6000, 3000, 1000],
        }}
        standings={[
          {
            userId: "live-user",
            firstName: "Alex",
            lastName: "Active",
            displayName: "Alex Active",
            isLeaderboardDisabled: false,
            currentRankTotal: "200",
            currentRankTotalMinor: 20000,
            currentPosition: 1,
            previewRankTotal: "220",
            previewRankTotalMinor: 22000,
            previewPosition: 1,
            deltaMinor: 2000,
            eligibleGamesCount: 4,
          },
          {
            userId: "excluded-user",
            firstName: "Casey",
            lastName: "Excluded",
            displayName: "Casey Excluded",
            isLeaderboardDisabled: true,
            currentRankTotal: "300",
            currentRankTotalMinor: 30000,
            currentPosition: null,
            previewRankTotal: "315",
            previewRankTotalMinor: 31500,
            previewPosition: null,
            deltaMinor: 1500,
            eligibleGamesCount: 5,
          },
        ]}
      />,
    );

    expect(screen.getByText("Leaderboard users")).toBeInTheDocument();
    expect(screen.getByText("Alex Active")).toBeInTheDocument();
    expect(screen.getByText("Casey Excluded")).toBeInTheDocument();
    expect(screen.getAllByText("Excluded").length).toBeGreaterThan(0);
    expect(screen.getAllByText("#1").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Disable" }));

    await waitFor(() =>
      expect(setPlayerRankLeaderboardDisabled).toHaveBeenCalledWith({
        userId: "live-user",
        disabled: true,
      }),
    );
    expect(refresh).toHaveBeenCalled();
    expect(screen.getAllByText("Enable").length).toBeGreaterThan(0);
  });
});
