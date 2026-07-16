import { describe, expect, it, vi } from "vitest";

vi.mock("./screens/incremental-screen", () => ({
  IncrementalPlayGameV2Screen: () => <div>incremental</div>,
}));
vi.mock("./screens/elimination-screen", () => ({
  EliminationPlayGameV2Screen: () => <div>elimination</div>,
}));
vi.mock("./screens/round-winner-screen", () => ({
  RoundWinnerPlayGameV2Screen: () => <div>round winner</div>,
}));

import { ItemizedPlayGameV2Screen } from "./screens/itemized-screen";
import { LostCitiesPlayGameV2Screen } from "./screens/lost-cities-screen";
import { IncrementalPlayGameV2Screen } from "./screens/incremental-screen";
import { resolvePlayGameV2Screen } from "./registry";
import { buildLostCitiesGameSettingsTemplate } from "@/lib/game/lost-cities";

function lostCitiesConfig() {
  const settings = buildLostCitiesGameSettingsTemplate();
  return {
    settings,
    itemizedCategories: settings.itemizedCategories,
    variant: "end-game-tally",
  } as never;
}

describe("resolvePlayGameV2Screen", () => {
  it("uses the Lost Cities custom screen for the title", () => {
    expect(
      resolvePlayGameV2Screen(
        lostCitiesConfig(),
        {
          normalizedTitle: "lost cities",
          customPlayScreenEnabled: true,
        },
      ),
    ).toBe(LostCitiesPlayGameV2Screen);
  });

  it("keeps Lost Cities on its custom screen even when an old flag is disabled", () => {
    expect(
      resolvePlayGameV2Screen(
        lostCitiesConfig(),
        {
          normalizedTitle: "lost cities",
          customPlayScreenEnabled: false,
        },
      ),
    ).toBe(LostCitiesPlayGameV2Screen);
  });

  it("uses the standard screen when Lost Cities gameplay settings change", () => {
    const config = lostCitiesConfig() as {
      settings: ReturnType<typeof buildLostCitiesGameSettingsTemplate>;
      itemizedCategories: Array<{ id: string }>;
    };

    expect(
      resolvePlayGameV2Screen(
        {
          ...config,
          settings: { ...config.settings, initialPlayerScore: 10 },
        } as never,
        { normalizedTitle: "lost cities" },
      ),
    ).toBe(ItemizedPlayGameV2Screen);
  });

  it("uses the universal itemized screen for every title with categories", () => {
    expect(
      resolvePlayGameV2Screen(
        {
          variant: "incremental",
          itemizedCategories: [{ id: "coins" }],
        } as never,
      ),
    ).toBe(ItemizedPlayGameV2Screen);
  });

  it("keeps the normal screen registry for games without categories", () => {
    expect(
      resolvePlayGameV2Screen({
        variant: "incremental",
        itemizedCategories: [],
      } as never),
    ).toBe(IncrementalPlayGameV2Screen);
  });
});
