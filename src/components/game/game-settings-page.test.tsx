import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameForPlayPage } from "@/lib/db/store/game.store";
import type { UserBase } from "@/lib/db/store/user.store";
import { renderWithProviders } from "../../../tests/helpers/render";
import GameSettingsPage from "./game-settings-page";

const routerPush = vi.fn();
const routerRefresh = vi.fn();
const updateGameSettings = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}));

vi.mock("@/app/actions/game", () => ({
  updateGameSettings: (...args: unknown[]) => updateGameSettings(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

function createUser(input: {
  id: string;
  firstName: string;
  lastName?: string;
  color?: string;
}): UserBase {
  return {
    id: input.id,
    clerkUserId: null,
    friendInviteToken: null,
    profileCardId: null,
    color: input.color ?? "#ffffff",
    role: "user",
    email: null,
    avatarUrl: null,
    firstName: input.firstName,
    lastName: input.lastName ?? null,
    created_by_user_id: null,
    mergedIntoUserId: null,
    mergedAt: null,
    isProfileComplete: true,
    isGuest: false,
    playerRankLeaderboardDisabled: false,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
}

function createGame(input?: { started?: boolean }): GameForPlayPage {
  const creator = createUser({ id: "user-1", firstName: "Mia", color: "#aaaaaa" });
  const opponent = createUser({ id: "user-2", firstName: "Kai", color: "#bbbbbb" });
  const started = input?.started ?? false;

  return {
    id: "game-1",
    gameTitleId: "title-1",
    version: "v1",
    creatorId: creator.id,
    scoringMode: "lowest_wins",
    endingMode: "round_count",
    trackRounds: true,
    targetRounds: 5,
    scoreThreshold: null,
    scoreThresholdDirection: null,
    completedRounds: started ? 2 : 0,
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: null,
    creator,
    gameTitle: {
      id: "title-1",
      title: "Skyjo",
      normalizedTitle: "skyjo",
      color: "#123456",
      imageUrl: "/images/skyjo.png",
      defaultScoringMode: null,
      defaultEndingMode: null,
      defaultTrackRounds: null,
      defaultTargetRounds: null,
      defaultScoreThreshold: null,
      defaultScoreThresholdDirection: null,
      isUniversal: true,
      createdByUserId: creator.id,
      mergedIntoGameTitleId: null,
      createdAt: "2025-01-01T00:00:00.000Z",
    },
    winners: [],
    resultPlacements: [],
    players: [
      {
        id: "game-player-1",
        gameId: "game-1",
        isManager: false,
        userId: creator.id,
        score: started ? 14 : 0,
        user: creator,
      },
      {
        id: "game-player-2",
        gameId: "game-1",
        isManager: false,
        userId: opponent.id,
        score: started ? 22 : 0,
        user: opponent,
      },
    ],
    rounds: started
      ? [
          {
            id: "round-1",
            gameId: "game-1",
            roundNumber: 1,
            createdAt: "2025-01-01T00:00:00.000Z",
            completedAt: "2025-01-01T00:00:00.000Z",
            scores: [
              {
                id: "score-1",
                gameRoundId: "round-1",
                userId: creator.id,
                scoreDelta: 14,
                user: creator,
              },
            ],
          },
        ]
      : [],
  };
}

describe("GameSettingsPage", () => {
  beforeEach(() => {
    routerPush.mockReset();
    routerRefresh.mockReset();
    updateGameSettings.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("saves editable settings for a game that has not started", async () => {
    updateGameSettings.mockResolvedValue({ id: "game-1" });

    renderWithProviders(<GameSettingsPage game={createGame()} />);

    expect(screen.getByRole("button", { name: /Save changes/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Highest score/i }));
    expect(screen.getByRole("button", { name: /Save changes/i })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));

    await waitFor(() => {
      expect(updateGameSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: "game-1",
          scoringMode: "highest_wins",
          endingMode: "round_count",
          targetRounds: 5,
        }),
      );
    });
  });

  it("uses the same dropdown treatment as create settings", () => {
    renderWithProviders(<GameSettingsPage game={createGame()} />);

    expect(screen.getByText("Rules")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Lowest score wins · End after 5 rounds/i),
    ).toHaveLength(2);
  });

  it("locks risky settings after play has started", () => {
    renderWithProviders(<GameSettingsPage game={createGame({ started: true })} />);

    expect(
      screen.getByText(
        /Settings cannot be update after scoring or rounds have been completed/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Highest score/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /After a set number of rounds/i }),
    ).toBeDisabled();
  });

  it("does not show delete controls on the settings page", () => {
    renderWithProviders(<GameSettingsPage game={createGame()} />);

    expect(
      screen.queryByRole("button", { name: /^Delete game$/i }),
    ).not.toBeInTheDocument();
  });
});
