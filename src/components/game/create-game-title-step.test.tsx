import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import CreateGameTitleStep from "./create-game-title-step";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

describe("CreateGameTitleStep", () => {
  beforeEach(() => {
    routerPush.mockReset();
  });

  it("routes to settings with a selected library title", () => {
    renderWithProviders(
      <CreateGameTitleStep
        gameTitles={[
          {
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
            accessSource: "universal",
            acquiredAt: null,
            acquiredFromUserId: null,
            acquiredFromUserName: null,
            isOwned: false,
          },
        ]}
        initialTitleId={null}
        initialNewTitle={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Skyjo" }));
    fireEvent.click(screen.getByRole("button", { name: /Continue to settings/i }));

    expect(routerPush).toHaveBeenCalledWith("/game/create/settings?titleId=title-1");
  });

  it("prioritizes a new title over a library selection", () => {
    renderWithProviders(
      <CreateGameTitleStep
        gameTitles={[]}
        initialTitleId={null}
        initialNewTitle={null}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Enter a title"), {
      target: { value: "  My Custom Game  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Continue to settings/i }));

    expect(routerPush).toHaveBeenCalledWith("/game/create/settings?newTitle=My+Custom+Game");
  });
});
