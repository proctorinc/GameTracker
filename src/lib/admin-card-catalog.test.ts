import { describe, expect, it } from "vitest";
import { buildAdminDeckViews } from "./admin-card-catalog";
import type { listDecksWithTemplates } from "./db/store/decks.store";

type RawDeck = Awaited<ReturnType<typeof listDecksWithTemplates>>[number];

function rawDeck(overrides: Partial<RawDeck> = {}): RawDeck {
  return {
    name: "standard",
    label: "Standard",
    description: "Fallback deck",
    isActive: true,
    packSize: 5,
    commonOdds: 100,
    uncommonOdds: 0,
    rareOdds: 0,
    legendaryOdds: 0,
    backStyle: "geometric",
    backPrimaryColor: "#4f46e5",
    backSecondaryColor: "#0f172a",
    backAccentColor: "#f8fafc",
    createdAt: "2026-07-15T00:00:00.000Z",
    updatedAt: "2026-07-15T00:00:00.000Z",
    rewardGameTitles: [],
    templates: [
      {
        id: "template-1",
        deckName: "standard",
        slug: "six-sided-die",
        name: "Die",
        description: "A die",
        rarity: "common",
        renderer: "game_piece",
        configJson: '{"piece":"die","accent":"#7c3aed"}',
        sortOrder: 0,
        isActive: true,
        createdAt: "2026-07-15T00:00:00.000Z",
        updatedAt: "2026-07-15T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("buildAdminDeckViews", () => {
  it("turns malformed renderer data into a visible issue and safe preview", () => {
    const deck = rawDeck({
      templates: [{ ...rawDeck().templates[0]!, configJson: "not-json" }],
    });
    const [view] = buildAdminDeckViews([deck], new Set());

    expect(view!.templates[0]!.preview.config).toEqual({ piece: "die", accent: "#7c3aed" });
    expect(view!.issues.some((issue) => issue.code.endsWith("invalid-renderer-config"))).toBe(true);
    expect(view!.issues.some((issue) => issue.code.endsWith("coded-definition-drift"))).toBe(true);
    expect(view!.issues.some((issue) => issue.code === "empty-deck")).toBe(true);
  });

  it("audits missing rarity coverage and issued templates", () => {
    const deck = rawDeck({ commonOdds: 70, uncommonOdds: 30 });
    const [view] = buildAdminDeckViews([deck], new Set(["template-1"]));

    expect(view!.templates[0]!.hasIssuedCards).toBe(true);
    expect(view!.issues).toContainEqual(expect.objectContaining({ code: "missing-uncommon", severity: "error" }));
    expect(view!.issues).toContainEqual(expect.objectContaining({ code: "no-games", severity: "warning" }));
  });
});
