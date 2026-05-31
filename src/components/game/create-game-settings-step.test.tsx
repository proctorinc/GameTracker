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

    expect(
      screen.getByText(/Selected from your library/i),
    ).toBeInTheDocument();
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
});
