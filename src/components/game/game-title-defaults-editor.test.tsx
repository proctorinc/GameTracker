import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import GameTitleDefaultsEditor from "./game-title-defaults-editor";
import {
  buildCreateGameSettingsFromTemplate,
  serializeGameSettingsV2,
} from "@/lib/game/v2";

const routerRefresh = vi.fn();
const saveGameTitleDefaults = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));
vi.mock("@/app/actions/game", () => ({
  saveGameTitleDefaults: (...args: unknown[]) => saveGameTitleDefaults(...args),
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
};

describe("GameTitleDefaultsEditor", () => {
  beforeEach(() => {
    routerRefresh.mockReset();
    saveGameTitleDefaults.mockReset();
  });

  it("loads roundless scoring and Gameplay defaults without an ending section", () => {
    const settings = buildCreateGameSettingsFromTemplate({
      template: "point_scoring",
      roundsEnabled: false,
      endConditionMode: "score_threshold",
      thresholdValue: 25,
      initialPlayerScore: 15,
    });
    renderWithProviders(
      <GameTitleDefaultsEditor
        title={{
          ...baseTitle,
          defaultSettingsVersion: "v2",
          defaultSettingsJson: serializeGameSettingsV2(settings),
        }}
      />,
    );

    expect(screen.getAllByText(/Score points/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No rounds/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("End condition")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("15")).toBeInTheDocument();
  });

  it("shows an inline error instead of crashing for an invalid itemized formula", () => {
    const settings = buildCreateGameSettingsFromTemplate({
      template: "point_scoring",
      roundsEnabled: false,
      itemizedCategories: [
        {
          id: "coins",
          name: "Coins",
          inputMode: "single",
          formula: "count * 2",
          inputs: [{ key: "count", label: "Count", defaultValue: 0 }],
        },
      ],
    });
    renderWithProviders(
      <GameTitleDefaultsEditor
        title={{
          ...baseTitle,
          defaultSettingsVersion: "v2",
          defaultSettingsJson: serializeGameSettingsV2(settings),
        }}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("count * 2"), {
      target: { value: "c" },
    });

    expect(screen.getByText('Unknown input "c"')).toBeInTheDocument();
  });

  it("starts with Gameplay unresolved when no V2 defaults exist", () => {
    renderWithProviders(<GameTitleDefaultsEditor title={baseTitle} />);

    expect(
      screen.getByText(
        /Choose scoring · Choose Rounds or No rounds · Choose who wins/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save defaults" }),
    ).toBeDisabled();
    expect(screen.queryByText(/Score at the end/i)).not.toBeInTheDocument();
  });

  it("saves multi-round elimination defaults", async () => {
    saveGameTitleDefaults.mockResolvedValue({ id: "title-1" });
    const settings = buildCreateGameSettingsFromTemplate({
      template: "elimination",
      roundsEnabled: true,
      endConditionMode: "fixed_rounds",
      targetRounds: 4,
    });
    renderWithProviders(
      <GameTitleDefaultsEditor
        title={{
          ...baseTitle,
          defaultSettingsVersion: "v2",
          defaultSettingsJson: serializeGameSettingsV2(settings),
        }}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Target rounds"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save defaults" }));

    await waitFor(() => expect(saveGameTitleDefaults).toHaveBeenCalledTimes(1));
    expect(saveGameTitleDefaults).toHaveBeenCalledWith({
      gameTitleId: "title-1",
      settingsV2: expect.objectContaining({
        scoringType: "elimination",
        gameEndTrigger: "rounds_exhausted",
        roundConfig: { enabled: true, targetRounds: 5 },
      }),
    });
    expect(routerRefresh).toHaveBeenCalled();
  });
});
