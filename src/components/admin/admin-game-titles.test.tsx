import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../tests/helpers/render";
import { describe, expect, it, vi } from "vitest";
import AdminGameTitles from "./admin-game-titles";

const refresh = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/titles",
  useRouter: () => ({
    refresh,
    replace,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/app/actions/game", () => ({
  mergeTitleIntoAnother: vi.fn(),
  promoteTitleToUniversal: vi.fn(),
}));

function createTitle() {
  return {
    id: "title-1",
    title: "Lost Cities",
    normalizedTitle: "lost cities",
    color: "#7c2d12",
    imageUrl: "/images/lost-cities.png",
    customPlayScreenEnabled: true,
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
    createdAt: "2026-07-11T00:00:00.000Z",
    creatorName: null,
    ownerCount: 4,
    gameCount: 7,
  };
}

describe("AdminGameTitles", () => {
  it("does not expose obsolete title-specific custom-screen controls", () => {
    renderWithProviders(
      <AdminGameTitles
        counts={{
          all: 1,
          universal: 1,
          nonUniversal: 0,
          userCustom: 0,
          adminSeed: 1,
        }}
        filter="all"
        page={1}
        pageSize={100}
        selectedSourceTitle={null}
        selectedTargetTitle={null}
        titles={[createTitle()]}
        totalCount={1}
        totalPages={1}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Lost Cities" }),
    ).toHaveAttribute("href", "/admin/titles/title-1");
    expect(screen.queryByText("Custom screen: Lost Cities")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Demo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /custom screen/i })).not.toBeInTheDocument();
  });
});
