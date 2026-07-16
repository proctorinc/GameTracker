import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../../tests/helpers/render";
import {
  GameTitleHeader,
  PlayGameV2AdminSettingsDrawer,
  PlayGameV2BottomBar,
} from "./shared";

const testGame = {
  id: "game-1",
  createdAt: "2026-07-11T00:00:00.000Z",
  completedAt: null,
  creatorId: "user-1",
  gameTitle: {
    title: "Lost Cities",
    color: "#7c2d12",
    imageUrl: "/images/lost-cities.png",
    imageVerticalFocus: 50,
  },
} as const;

describe("play-game-v2 shared surfaces", () => {
  it("renders the shared header with an admin drawer trigger", () => {
    renderWithProviders(
      <GameTitleHeader
        adminDrawer={
          <PlayGameV2AdminSettingsDrawer
            actions={{ canManagePlayers: true, onOpenManagePlayers: vi.fn() }}
            config={{
              completedAt: null,
              createdAt: testGame.createdAt,
              creatorName: "Alex R.",
              endingSummary: "Free play",
              gameId: testGame.id,
              isCompleted: false,
              scoringSummary: "Highest score wins",
            }}
          />
        }
        game={testGame as never}
        header={{
          summary: "Highest score wins · Free play",
          title: "Lost Cities",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Lost Cities" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Highest score wins/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Game options" }),
    ).toBeInTheDocument();
  });

  it("opens the shared admin drawer and triggers callbacks", async () => {
    const user = userEvent.setup();
    const onOpenManagePlayers = vi.fn();
    const onOpenShare = vi.fn();
    const onEndGame = vi.fn();

    renderWithProviders(
      <PlayGameV2AdminSettingsDrawer
        actions={{
          canEndGame: true,
          canManagePlayers: true,
          canShare: true,
          canUpdateSettings: true,
          onEndGame,
          onOpenManagePlayers,
          onOpenShare,
        }}
        config={{
          completedAt: null,
          createdAt: testGame.createdAt,
          creatorName: "Alex R.",
          endingSummary: "Free play",
          gameId: testGame.id,
          isCompleted: false,
          scoringSummary: "Highest score wins",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Game options" }));
    expect(screen.getByText("Created by Alex R.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Manage players" }));
    await user.click(screen.getByRole("button", { name: "Share invite link" }));
    await user.click(screen.getByRole("button", { name: "End game" }));

    expect(onOpenManagePlayers).toHaveBeenCalledTimes(1);
    expect(onOpenShare).toHaveBeenCalledTimes(1);
    expect(onEndGame).toHaveBeenCalledTimes(1);
  });

  it("renders the standard bottom bar preset with shared button styling", async () => {
    const user = userEvent.setup();
    const onScores = vi.fn();
    const onPause = vi.fn();
    const onNextRound = vi.fn();

    renderWithProviders(
      <PlayGameV2BottomBar
        leadingAction={{
          icon: undefined,
          label: "Scores",
          onClick: onScores,
        }}
        primaryAction={{
          icon: undefined,
          label: "Next round",
          onClick: onNextRound,
          variant: "default",
        }}
        secondaryAction={{
          icon: undefined,
          label: "Pause",
          onClick: onPause,
        }}
        variant="standard"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Scores" }));
    await user.click(screen.getByRole("button", { name: "Pause" }));
    await user.click(screen.getByRole("button", { name: "Next round" }));

    expect(onScores).toHaveBeenCalledTimes(1);
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onNextRound).toHaveBeenCalledTimes(1);
  });
});
