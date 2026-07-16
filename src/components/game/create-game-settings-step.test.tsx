import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import CreateGameSettingsStep from "./create-game-settings-step";
import {
  buildCreateGameSettingsFromTemplate,
  serializeGameSettingsV2,
} from "@/lib/game/v2";
import { buildLostCitiesGameSettingsTemplate } from "@/lib/game/lost-cities";

const routerPush = vi.fn();
const routerReplace = vi.fn();
const createConfiguredGame = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/game/create/settings",
  useRouter: () => ({ push: routerPush, replace: routerReplace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/actions/game", () => ({
  createConfiguredGame: (...args: unknown[]) => createConfiguredGame(...args),
}));

const baseTitle = {
  id: "title-1",
  title: "Skyjo",
  normalizedTitle: "skyjo",
  color: "#123456",
  imageUrl: "/images/skyjo.png",
  imageVerticalFocus: 50,
  defaultScoringMode: null,
  defaultEndingMode: null,
  defaultTrackRounds: null,
  defaultTargetRounds: null,
  defaultScoreThreshold: null,
  defaultScoreThresholdDirection: null,
  defaultSettingsVersion: null,
  defaultSettingsJson: null,
  isUniversal: true,
  createdByUserId: null,
  mergedIntoGameTitleId: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  accessSource: "universal" as const,
  acquiredAt: null,
  acquiredFromUserId: null,
  acquiredFromUserName: null,
  isOwned: false,
  personalDefaultPlayerRole: "player" as const,
  personalGameSpecificSettingsJson: null,
};

function titleWithDefaults(
  settings: ReturnType<typeof buildCreateGameSettingsFromTemplate>,
) {
  return {
    ...baseTitle,
    defaultSettingsVersion: "v2" as const,
    defaultSettingsJson: serializeGameSettingsV2(settings),
  };
}

function renderStep(title = baseTitle) {
  return renderWithProviders(
    <CreateGameSettingsStep
      allGameTitles={[title]}
      currentUserColor="#ff6600"
      initialNewTitle={null}
      initialSelectedTitle={title}
      suggestedGameTitles={[title]}
    />,
  );
}

function openGameplaySettings() {
  if (!screen.queryByRole("tablist", { name: "Settings presets" })) {
    fireEvent.click(
      screen.getByRole("button", { name: /Gameplay (Game defaults|My defaults|Custom settings)/i }),
    );
  }
}

describe("CreateGameSettingsStep", () => {
  beforeEach(() => {
    routerPush.mockReset();
    routerReplace.mockReset();
    createConfiguredGame.mockReset();
    createConfiguredGame.mockResolvedValue({ id: "game-1" });
  });

  it("shows the three scoring choices and Gameplay immediately after Scoring", () => {
    renderStep();

    expect(screen.getByText("No community defaults")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Score points Add or subtract points as the game is played/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Choose the winner/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Elimination/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Score at the end/i)).not.toBeInTheDocument();

    const scoringHeading = screen.getByText("Game Scoring");
    const gameplayHeading = screen.getAllByText("Gameplay").at(-1)!;
    expect(
      scoringHeading.compareDocumentPosition(gameplayHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start game" })).toBeDisabled();
  });

  it("shows personal Lost Cities and management cards outside Gameplay presets", async () => {
    const lostCities = {
      ...titleWithDefaults(buildLostCitiesGameSettingsTemplate()),
      id: "lost-cities",
      title: "Lost Cities",
      normalizedTitle: "lost cities",
    };
    renderStep(lostCities);

    openGameplaySettings();
    const presets = screen.getByRole("tablist", { name: "Settings presets" });
    const gameplay = screen.getByRole("button", {
      name: /Gameplay Game defaults/i,
    });
    const gameSettings = screen.getByRole("heading", {
      name: "Lost Cities settings",
    });
    const management = screen.getByRole("heading", { name: "Management" });

    const gameSettingsTag = within(gameSettings.closest("button")!).getByText(
      "5 expeditions",
      { selector: "span" },
    );
    const managementTag = within(management.closest("button")!).getByText(
      "View only",
      { selector: "span" },
    );
    expect(gameSettingsTag).toHaveClass(
      "inline-flex",
      "rounded-full",
      "uppercase",
    );
    expect(managementTag).toHaveClass(
      "inline-flex",
      "rounded-full",
      "uppercase",
    );
    expect(gameSettingsTag.parentElement).not.toBe(gameSettings.parentElement);
    expect(managementTag.parentElement).not.toBe(management.parentElement);

    expect(
      gameplay.compareDocumentPosition(presets) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      gameplay.compareDocumentPosition(gameSettings) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      gameSettings.compareDocumentPosition(management) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByLabelText(/settings complete/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    await waitFor(() => expect(createConfiguredGame).toHaveBeenCalledTimes(1));
    expect(createConfiguredGame).toHaveBeenCalledWith(
      expect.objectContaining({
        gameSpecificSettings: { expeditionCount: 5 },
        managementSettings: { defaultPlayerRole: "player" },
      }),
    );
  });

  it("defaults management to View only until the user creates a preference", () => {
    renderStep({
      ...titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
        }),
      ),
      personalDefaultPlayerRole: null,
    });

    const managementCard = screen
      .getByRole("heading", { name: "Management" })
      .closest("button");
    expect(managementCard).not.toBeNull();
    expect(
      within(managementCard!).getByText("View only", { selector: "span" }),
    ).toHaveClass("inline-flex", "rounded-full", "uppercase");
    expect(screen.getByRole("button", { name: "Start game" })).toBeEnabled();

    fireEvent.click(managementCard!);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Player permissions View only selected/i,
      }),
    );

    const none = screen.getByRole("button", {
      name: /View only\. Joining players can view the game only/i,
    });
    const ownScores = screen.getByRole("button", {
      name: /Own scores\. Joining players can edit their own score/i,
    });
    const manager = screen.getByRole("button", {
      name: /Manager\. Joining players can manage all players and scores/i,
    });

    expect(none).toHaveAttribute("aria-pressed", "true");
    expect(ownScores).toHaveAttribute("aria-pressed", "false");
    expect(manager).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(ownScores);

    expect(
      screen.queryByRole("button", {
        name: /Own scores\. Joining players can edit their own score/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Management" }).closest("button"),
    ).toHaveTextContent("Own scores");
    expect(screen.getByRole("button", { name: "Start game" })).toBeEnabled();
  });

  it("uses a collapsing vertical selector for title-specific settings", async () => {
    const lostCities = {
      ...titleWithDefaults(buildLostCitiesGameSettingsTemplate()),
      id: "lost-cities",
      title: "Lost Cities",
      normalizedTitle: "lost cities",
    };
    renderStep(lostCities);

    const gameSettingsCard = screen
      .getByRole("heading", { name: "Lost Cities settings" })
      .closest("button");
    expect(gameSettingsCard).not.toBeNull();
    fireEvent.click(gameSettingsCard!);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Expeditions 5 expeditions selected/i,
      }),
    );

    const fiveExpeditions = screen.getByRole("button", {
      name: /5 expeditions\. Play without the Purple expedition/i,
    });
    const sixExpeditions = screen.getByRole("button", {
      name: /6 expeditions\. Play with all six expeditions/i,
    });
    expect(fiveExpeditions).toHaveAttribute("aria-pressed", "true");
    expect(
      fiveExpeditions.compareDocumentPosition(sixExpeditions) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(sixExpeditions);

    expect(
      screen
        .getByText("Play with all six expeditions")
        .closest('[aria-hidden="true"]'),
    ).not.toBeNull();
    expect(
      screen
        .getByRole("heading", { name: "Lost Cities settings" })
        .closest("button"),
    ).toHaveTextContent("6 expeditions");

    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    await waitFor(() => expect(createConfiguredGame).toHaveBeenCalledTimes(1));
    expect(createConfiguredGame).toHaveBeenCalledWith(
      expect.objectContaining({
        gameSpecificSettings: { expeditionCount: 6 },
      }),
    );
  });

  it("lets Fixed number of rounds be selected before entering the target", () => {
    renderStep();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Score points Add or subtract points as the game is played/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Multiple Rounds/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /Fixed number of rounds/i }),
    );

    expect(screen.getByPlaceholderText("Target rounds")).toHaveValue(6);
    expect(screen.getByRole("button", { name: "Start game" })).toBeDisabled();
  });

  it("prepopulates starting score and score threshold numeric inputs", () => {
    renderStep();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Score points Add or subtract points as the game is played/i,
      }),
    );
    expect(screen.getByPlaceholderText("Starting score")).toHaveValue(0);

    fireEvent.click(screen.getByRole("button", { name: /^No rounds /i }));
    fireEvent.click(screen.getByRole("button", { name: /Gameplay No rounds/i }));
    fireEvent.click(screen.getByRole("button", { name: /Multiple Rounds/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /Score threshold/i }),
    );
    expect(screen.getByPlaceholderText("Score target")).toHaveValue(100);
  });

  it("shows a title's numeric game default outside the input and reapplies it", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
          initialPlayerScore: 7,
        }),
      ),
    );

    openGameplaySettings();
    fireEvent.click(screen.getByRole("tab", { name: "Custom" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: /Score points Default Add or subtract points as the game is played/i,
      }),
    );
    const startingScore = screen.getByPlaceholderText("Starting score");
    expect(startingScore).toHaveValue(0);

    const gameDefaultSuggestion = screen.getByRole("button", {
      name: "Use game default 7",
    });
    expect(gameDefaultSuggestion).toHaveStyle({ color: "#123456" });
    fireEvent.click(gameDefaultSuggestion);
    expect(
      screen
        .getByPlaceholderText("Starting score")
        .closest('[aria-hidden="true"]'),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: /Initial score Starts at 7/i }),
    ).toBeInTheDocument();
  });

  it("applies and confirms a round-count game default in one click", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: true,
          endConditionMode: "fixed_rounds",
          targetRounds: 8,
        }),
      ),
    );

    openGameplaySettings();
    fireEvent.click(screen.getByRole("tab", { name: "Custom" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: /Score points Default Add or subtract points as the game is played/i,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Multiple Rounds Default/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Fixed number of rounds Default/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Use game default 8" }),
    );

    expect(
      screen
        .getByPlaceholderText("Target rounds")
        .closest('[aria-hidden="true"]'),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", {
        name: /End condition Ends after 8 rounds/i,
      }),
    ).toBeInTheDocument();
  });

  it("labels configured settings as custom", () => {
    renderStep();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Score points Add or subtract points as the game is played/i,
      }),
    );

    expect(screen.getByText("Custom settings")).toHaveStyle({
      color: "#ff6600",
    });
    expect(screen.queryByText("No community defaults")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Game Scoring Score points Setting selected/i,
      }),
    ).not.toHaveTextContent("Selected");
    expect(screen.getByLabelText("Setting selected")).toBeInTheDocument();
  });

  it("labels title defaults and omits checks from the summary chips", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
        }),
      ),
    );

    const settingsSummary = screen.getByRole("button", {
      name: /Gameplay Game defaults/i,
    });
    const settingsHeader = settingsSummary.closest('[data-slot="card-header"]');

    expect(screen.getByText("Game defaults", { selector: "span" })).toHaveStyle(
      {
        color: "#123456",
      },
    );
    expect(settingsHeader?.querySelector(".lucide-check")).toBeNull();
    expect(settingsHeader).toHaveTextContent("Score points");
    expect(settingsHeader?.textContent?.match(/No rounds/g)).toHaveLength(1);
    expect(settingsHeader).toHaveTextContent("Highest score wins");
    expect(settingsHeader).toHaveTextContent("Starts at 0");
    expect(settingsHeader).not.toHaveTextContent(/Rank points/i);
  });

  it("does not clip the selected game title card corners", () => {
    renderStep();

    const titleButton = screen.getByRole("button", {
      name: /Skyjo Selected · Tap to change/i,
    });
    const titleCard = titleButton.querySelector('[data-slot="card"]');

    expect(titleCard).toHaveClass(
      "overflow-visible",
      "rounded-xl",
      "border-0",
      "ring-0",
    );
  });

  it.each([
    {
      name: "roundless point scoring",
      settings: buildCreateGameSettingsFromTemplate({
        template: "point_scoring",
        roundsEnabled: false,
        endConditionMode: "score_threshold",
        thresholdValue: 25,
        initialPlayerScore: 0,
      }),
      expected: {
        scoringType: "points",
        gameEndTrigger: "manual_finish",
        roundConfig: { enabled: false },
      },
    },
    {
      name: "multi-round winner selection",
      settings: buildCreateGameSettingsFromTemplate({
        template: "choose_winner",
        roundsEnabled: true,
        endConditionMode: "fixed_rounds",
        targetRounds: 5,
      }),
      expected: {
        scoringType: "winner_selection",
        gameEndTrigger: "rounds_exhausted",
        roundConfig: { enabled: true, targetRounds: 5 },
      },
    },
    {
      name: "multi-round elimination",
      settings: buildCreateGameSettingsFromTemplate({
        template: "elimination",
        roundsEnabled: true,
        endConditionMode: "score_threshold",
        thresholdValue: 3,
      }),
      expected: {
        scoringType: "elimination",
        gameEndTrigger: "points_threshold_reached",
        roundConfig: { enabled: true },
      },
    },
  ])("submits $name defaults", async ({ settings, expected }) => {
    renderStep(titleWithDefaults(settings));

    fireEvent.click(screen.getByRole("button", { name: "Start game" }));

    await waitFor(() => expect(createConfiguredGame).toHaveBeenCalledTimes(1));
    expect(createConfiguredGame.mock.calls[0]?.[0].settingsV2).toMatchObject(
      expected,
    );
    expect(createConfiguredGame.mock.calls[0]?.[0].settingsSource).toBe(
      "game_default",
    );
    expect(routerPush).toHaveBeenCalledWith("/game/game-1/play");
  });

  it("prefers personal defaults and exposes all available settings tabs", () => {
    const gameDefaults = buildCreateGameSettingsFromTemplate({
      template: "point_scoring",
      roundsEnabled: false,
      initialPlayerScore: 0,
    });
    const personalDefaults = buildCreateGameSettingsFromTemplate({
      template: "point_scoring",
      roundsEnabled: false,
      initialPlayerScore: 10,
    });

    renderStep({
      ...titleWithDefaults(gameDefaults),
      personalSettingsVersion: "v2" as const,
      personalSettingsJson: serializeGameSettingsV2(personalDefaults),
    });

    openGameplaySettings();
    expect(screen.getByRole("tab", { name: "Game defaults" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "My defaults" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Custom" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(
      screen.getByText("My defaults", { selector: "span" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Starts at 10")).not.toHaveLength(0);
  });

  it("prefers game defaults and warns when custom-screen settings change", () => {
    const gameDefaults = buildLostCitiesGameSettingsTemplate();
    const personalDefaults = buildCreateGameSettingsFromTemplate({
      template: "point_scoring",
      roundsEnabled: false,
      initialPlayerScore: 10,
    });

    renderStep({
      ...titleWithDefaults(gameDefaults),
      id: "lost-cities",
      title: "Lost Cities",
      normalizedTitle: "lost cities",
      personalSettingsVersion: "v2" as const,
      personalSettingsJson: serializeGameSettingsV2(personalDefaults),
    });

    openGameplaySettings();
    expect(screen.getByRole("tab", { name: "Game defaults" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Custom play screen available")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Gameplay Game defaults/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Game Scoring/i }));
    fireEvent.click(screen.getByRole("button", { name: /Choose the winner/i }));

    expect(
      screen.getByText("Custom play screen unavailable"),
    ).toBeInTheDocument();
  });

  it("moves a preset into Custom as soon as a setting changes", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
        }),
      ),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Gameplay Game defaults/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Game Scoring/i }));
    fireEvent.click(screen.getByRole("button", { name: /Choose the winner/i }));

    openGameplaySettings();
    expect(screen.getByRole("tab", { name: "Custom" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Custom settings")).toBeInTheDocument();
  });

  it("clears preset choices when Custom is selected directly", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
          initialPlayerScore: 7,
        }),
      ),
    );

    openGameplaySettings();
    fireEvent.click(screen.getByRole("tab", { name: "Custom" }));

    expect(screen.getByRole("tab", { name: "Custom" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("button", { name: "Start game" })).toBeDisabled();
    expect(screen.getByText("Custom settings")).toBeInTheDocument();
    expect(screen.queryByText("Starts at 7")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Setting selected")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Score points Default Add or subtract points as the game is played/i,
      }),
    ).toHaveTextContent("Default");
    expect(createConfiguredGame).not.toHaveBeenCalled();
  });

  it("uses the title color for selected Custom values that match game defaults", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
        }),
      ),
    );

    openGameplaySettings();
    fireEvent.click(screen.getByRole("tab", { name: "Custom" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: /Score points Default Add or subtract points as the game is played/i,
      }),
    );

    const scoringSection = screen.getByRole("button", {
      name: /Game Scoring Score points Setting selected/i,
    });
    expect(within(scoringSection).getByLabelText("Setting selected")).toHaveStyle({
      borderColor: "#123456",
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Multiple Rounds/i }),
    );
    const gameplaySection = screen.getByRole("button", {
      name: /Gameplay Rounds Setting selected/i,
    });
    expect(within(gameplaySection).getByLabelText("Setting selected")).toHaveStyle({
      borderColor: "#ff6600",
    });
  });

  it("restores the in-memory Custom draft after visiting another tab", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
        }),
      ),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Gameplay Game defaults/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Game Scoring/i }));
    fireEvent.click(screen.getByRole("button", { name: /Choose the winner/i }));
    openGameplaySettings();
    expect(screen.getByRole("tab", { name: "Custom" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Game defaults" }));
    fireEvent.click(screen.getByRole("tab", { name: "Custom" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Gameplay Custom settings/i }),
    );

    expect(
      screen.getByRole("button", { name: /Game Scoring Choose the winner/i }),
    ).toBeInTheDocument();
  });

  it("switches to My defaults when Custom matches the personal preset", () => {
    const gameDefaults = buildCreateGameSettingsFromTemplate({
      template: "point_scoring",
      roundsEnabled: false,
      initialPlayerScore: 0,
    });
    const personalDefaults = buildCreateGameSettingsFromTemplate({
      template: "point_scoring",
      roundsEnabled: false,
      initialPlayerScore: 10,
    });
    renderStep({
      ...titleWithDefaults(gameDefaults),
      personalSettingsVersion: "v2" as const,
      personalSettingsJson: serializeGameSettingsV2(personalDefaults),
    });

    openGameplaySettings();
    fireEvent.click(screen.getByRole("tab", { name: "Game defaults" }));
    fireEvent.click(screen.getByRole("button", { name: /Initial score/i }));
    fireEvent.change(screen.getByPlaceholderText("Starting score"), {
      target: { value: "10" },
    });

    expect(screen.getByRole("tab", { name: "Custom" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm starting score" }),
    );
    openGameplaySettings();
    expect(screen.getByRole("tab", { name: "My defaults" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("switches back to Game defaults when Custom matches the title preset", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
          initialPlayerScore: 0,
        }),
      ),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Gameplay Game defaults/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Initial score/i }));
    const startingScore = screen.getByPlaceholderText("Starting score");
    fireEvent.change(startingScore, { target: { value: "1" } });
    expect(screen.getByRole("tab", { name: "Custom" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.change(startingScore, { target: { value: "0" } });
    expect(screen.getByRole("tab", { name: "Custom" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm starting score" }),
    );
    openGameplaySettings();
    expect(screen.getByRole("tab", { name: "Game defaults" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("does not match defaults until threshold and starting score are confirmed", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: true,
          endConditionMode: "score_threshold",
          thresholdValue: 100,
          initialPlayerScore: 0,
        }),
      ),
    );

    openGameplaySettings();
    fireEvent.click(screen.getByRole("tab", { name: "Custom" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: /Score points Default Add or subtract points as the game is played/i,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Multiple Rounds Default/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Highest score Default/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Score threshold/i }),
    );

    expect(screen.getByRole("tab", { name: "Custom" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Confirm score target/i }),
    );
    expect(screen.getByRole("tab", { name: "Custom" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Confirm starting score" }),
    );
    openGameplaySettings();
    expect(screen.getByRole("tab", { name: "Game defaults" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("renders settings tabs in the Gameplay header above the summary tags", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
        }),
      ),
    );

    const tabs = screen.getByRole("tablist", { name: "Settings presets" });
    const settingsHeader = screen.getByRole("button", {
      name: /Gameplay Game defaults/i,
    });
    expect(
      settingsHeader.closest('[data-slot="card-header"]'),
    ).toContainElement(tabs);
    expect(
      settingsHeader.compareDocumentPosition(tabs) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const scorePointsTag = screen.getByText("Score points", {
      selector: "span",
    });
    expect(
      tabs.compareDocumentPosition(scorePointsTag) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("animates the Gameplay dropdown with the dashboard rank transition", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
        }),
      ),
    );

    const settingsToggle = screen.getByRole("button", {
      name: /Gameplay Game defaults/i,
    });
    const animatedContent = settingsToggle
      .closest('[data-slot="card-header"]')
      ?.nextElementSibling;

    expect(animatedContent).toHaveClass(
      "grid",
      "transition-all",
      "duration-300",
      "ease-out",
      "grid-rows-[0fr]",
      "opacity-0",
    );
    expect(settingsToggle.closest('[data-slot="card"]')).toHaveClass("gap-0");

    fireEvent.click(settingsToggle);

    expect(animatedContent).toHaveClass(
      "grid-rows-[1fr]",
      "opacity-100",
    );
    expect(
      animatedContent?.querySelector('[data-slot="card-content"]'),
    ).toHaveClass("pt-4");
  });

  it("opens the Gameplay dropdown when a summary tag is clicked", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
        }),
      ),
    );

    const settingsToggle = screen.getByRole("button", {
      name: /Gameplay Game defaults/i,
    });
    expect(settingsToggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByText("Score points", { selector: "span" }));

    expect(settingsToggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: /Game Scoring Score points/i }),
    ).toBeInTheDocument();
  });

  it("does not clip the colored Gameplay header border", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
        }),
      ),
    );

    const settingsHeader = screen.getByRole("button", {
      name: /Gameplay Game defaults/i,
    });
    const settingsCard = settingsHeader.closest('[data-slot="card"]');
    const settingsChrome = settingsHeader.parentElement;

    expect(settingsCard).toHaveClass("overflow-visible", "border-0", "ring-0");
    expect(settingsChrome).toHaveClass("rounded-t-2xl", "rounded-b-2xl");
  });

  it("does not show End condition for No rounds gameplay", () => {
    renderStep(
      titleWithDefaults(
        buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
        }),
      ),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Gameplay Game defaults/i }),
    );
    expect(screen.getAllByText("Gameplay").length).toBeGreaterThan(1);
    expect(screen.queryByText("End condition")).not.toBeInTheDocument();
  });

  it("shows Rounds and No rounds when Gameplay is opened", () => {
    renderStep();
    fireEvent.click(
      screen.getByRole("button", {
        name: /Score points Add or subtract points as the game is played/i,
      }),
    );

    expect(
      screen.getByRole("button", { name: /^Multiple Rounds /i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^No rounds /i }),
    ).toBeInTheDocument();
  });
});
