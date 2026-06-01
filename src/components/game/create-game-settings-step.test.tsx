import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import CreateGameSettingsStep from "./create-game-settings-step";

const routerPush = vi.fn();
const createConfiguredGame = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock("@/app/actions/game", () => ({
  createConfiguredGame: (...args: unknown[]) => createConfiguredGame(...args),
}));

const skyjoTitle = {
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
  createdByUserId: null,
  mergedIntoGameTitleId: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  accessSource: "universal" as const,
  acquiredAt: null,
  acquiredFromUserId: null,
  acquiredFromUserName: null,
  isOwned: false,
};

describe("CreateGameSettingsStep", () => {
  beforeEach(() => {
    routerPush.mockReset();
    createConfiguredGame.mockReset();
  });

  it("shows the game selector first when no title is preselected", () => {
    renderWithProviders(
      <CreateGameSettingsStep
        allGameTitles={[skyjoTitle]}
        initialNewTitle={null}
        initialSelectedTitle={null}
        suggestedGameTitles={[skyjoTitle]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Choose game" }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search or create a game"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Settings" }),
    ).not.toBeInTheDocument();
  });

  it("reveals settings immediately after choosing a suggested title", () => {
    renderWithProviders(
      <CreateGameSettingsStep
        allGameTitles={[skyjoTitle]}
        initialNewTitle={null}
        initialSelectedTitle={null}
        suggestedGameTitles={[skyjoTitle]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Skyjo/i }));

    expect(screen.getByText(/Selected/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Search or create a game"),
    ).not.toBeInTheDocument();
  });

  it("shows selected game art while keeping the selected card clickable", () => {
    renderWithProviders(
      <CreateGameSettingsStep
        allGameTitles={[skyjoTitle]}
        initialNewTitle={null}
        initialSelectedTitle={null}
        suggestedGameTitles={[skyjoTitle]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Skyjo/i }));

    const selectedCard = screen.getByRole("button", {
      name: /Skyjo[\s\S]*Tap to change/i,
    });

    expect(selectedCard).toHaveStyle({ backgroundColor: "#123456" });
    expect(selectedCard.querySelector("[style*='background-image']")).toHaveStyle({
      backgroundImage: 'url("/images/skyjo.png")',
    });

    fireEvent.click(selectedCard);

    expect(
      screen.getByPlaceholderText("Search or create a game"),
    ).toBeInTheDocument();
  });

  it("allows creating a custom title from the same page", async () => {
    renderWithProviders(
      <CreateGameSettingsStep
        allGameTitles={[skyjoTitle]}
        initialNewTitle={null}
        initialSelectedTitle={null}
        suggestedGameTitles={[skyjoTitle]}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Search or create a game"), {
      target: { value: "My Custom Game" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Create "My Custom Game"/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Create "My Custom Game"/i }));

    expect(screen.getByText("My Custom Game")).toBeInTheDocument();
    expect(screen.getByText(/New title/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("creates a no-score game without score threshold settings", async () => {
    createConfiguredGame.mockResolvedValue({ id: "game-123" });

    renderWithProviders(
      <CreateGameSettingsStep
        allGameTitles={[skyjoTitle]}
        initialNewTitle={null}
        initialSelectedTitle={null}
        suggestedGameTitles={[skyjoTitle]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Skyjo/i }));
    fireEvent.click(screen.getByRole("button", { name: /No score/i }));
    fireEvent.click(screen.getByRole("button", { name: /Start game/i }));

    await waitFor(() => {
        expect(createConfiguredGame).toHaveBeenCalledWith(
          expect.objectContaining({
            scoringMode: "no_score",
            endingMode: "none",
            trackRounds: false,
            scoreThreshold: null,
            scoreThresholdDirection: null,
          }),
        );
      });
  });

  it("creates a free-play game with rounds when selected", async () => {
    createConfiguredGame.mockResolvedValue({ id: "game-456" });

    renderWithProviders(
      <CreateGameSettingsStep
        allGameTitles={[skyjoTitle]}
        initialNewTitle={null}
        initialSelectedTitle={null}
        suggestedGameTitles={[skyjoTitle]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Skyjo/i }));
    fireEvent.click(screen.getByRole("button", { name: /Free play/i }));
    fireEvent.click(screen.getByRole("button", { name: /Include rounds/i }));
    fireEvent.click(screen.getByRole("button", { name: /Start game/i }));

    await waitFor(() => {
      expect(createConfiguredGame).toHaveBeenCalledWith(
        expect.objectContaining({
          endingMode: "none",
          trackRounds: true,
        }),
      );
    });
  });
});
