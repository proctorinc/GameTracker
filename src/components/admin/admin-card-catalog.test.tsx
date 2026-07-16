import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import type { AdminDeckView } from "@/lib/admin-card-catalog";
import { AdminCardCatalog } from "./admin-card-catalog";

const { refresh, saveCardDeck, saveCardTemplate } = vi.hoisted(() => ({
  refresh: vi.fn(),
  saveCardDeck: vi.fn(),
  saveCardTemplate: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/app/actions/card-admin", () => ({ saveCardDeck, saveCardTemplate }));

function buildDecks(): AdminDeckView[] {
  return [
    {
      name: "standard",
      label: "Score Loser",
      description: "Game-night treasures.",
      isActive: true,
      packSize: 5,
      commonOdds: 70,
      uncommonOdds: 20,
      rareOdds: 8,
      legendaryOdds: 2,
      backStyle: "geometric",
      backPrimaryColor: "#4f46e5",
      backSecondaryColor: "#0f172a",
      backAccentColor: "#f8fafc",
      createdAt: "2026-07-15T00:00:00.000Z",
      updatedAt: "2026-07-15T00:00:00.000Z",
      rewardGameTitles: [{ id: "game-1", title: "Skyjo" }] as AdminDeckView["rewardGameTitles"],
      issues: [],
      templates: [
        {
          id: "template-1",
          deckName: "standard",
          slug: "six-sided-die",
          name: "Six-Sided Die",
          description: "A tiny engine of fate.",
          rarity: "common",
          renderer: "game_piece",
          configJson: '{"piece":"die","accent":"#7c3aed"}',
          sortOrder: 0,
          isActive: true,
          createdAt: "2026-07-15T00:00:00.000Z",
          updatedAt: "2026-07-15T00:00:00.000Z",
          hasIssuedCards: false,
          config: { piece: "die", accent: "#7c3aed" },
          issues: [],
          preview: {
            instanceId: null,
            identityKey: "admin:template-1",
            deckName: "standard",
            deckLabel: "Score Loser",
            templateId: "template-1",
            templateSlug: "six-sided-die",
            name: "Six-Sided Die",
            description: "A tiny engine of fate.",
            rarity: "common",
            renderer: "game_piece",
            config: { piece: "die", accent: "#7c3aed" },
            subjectType: null,
            subjectId: null,
            subject: null,
            unavailable: false,
            collected: false,
            quantity: 0,
          },
        },
      ],
    },
    {
      name: "broken",
      label: "Broken Deck",
      description: "Needs attention.",
      isActive: true,
      packSize: 5,
      commonOdds: 70,
      uncommonOdds: 20,
      rareOdds: 8,
      legendaryOdds: 2,
      backStyle: "classic",
      backPrimaryColor: "#ef4444",
      backSecondaryColor: "#450a0a",
      backAccentColor: "#ffffff",
      createdAt: "2026-07-15T00:00:00.000Z",
      updatedAt: "2026-07-15T00:00:00.000Z",
      rewardGameTitles: [] as AdminDeckView["rewardGameTitles"],
      templates: [],
      issues: [{ code: "empty-deck", severity: "error", message: "Active deck has no usable active cards" }],
    },
  ];
}

const gameTitles = [
  { id: "game-1", title: "Skyjo", normalizedTitle: "skyjo", rewardDeckName: "standard" },
  { id: "game-2", title: "Lost Cities", normalizedTitle: "lost cities", rewardDeckName: null },
];

describe("AdminCardCatalog", () => {
  beforeEach(() => {
    refresh.mockReset();
    saveCardDeck.mockReset();
    saveCardTemplate.mockReset();
  });

  it("shows deck artwork and health before expanding card previews", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminCardCatalog decks={buildDecks()} gameTitles={gameTitles} globalIssues={[]} />);

    expect(screen.getByLabelText("Score Loser deck back")).toHaveAttribute("data-back-style", "geometric");
    expect(screen.getAllByText("Active deck has no usable active cards").some((element) => element.classList.contains("text-destructive"))).toBe(true);
    expect(screen.queryByText("Six-Sided Die")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /show cards/i })[0]!);
    expect(screen.getAllByText("Six-Sided Die").length).toBeGreaterThan(0);
    expect(screen.getByText("A tiny engine of fate.")).toBeInTheDocument();
  });

  it("searches the catalog and filters to decks with errors", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminCardCatalog decks={buildDecks()} gameTitles={gameTitles} globalIssues={[]} />);

    await user.type(screen.getByPlaceholderText("Search decks or cards"), "die");
    expect(screen.getAllByText("Score Loser").length).toBeGreaterThan(0);
    expect(screen.queryByText("Broken Deck")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search decks or cards"));
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter catalog status" }), "errors");
    expect(screen.getAllByText("Broken Deck").length).toBeGreaterThan(0);
    expect(screen.queryByText("Score Loser")).not.toBeInTheDocument();
  });

  it("opens deck and card configuration in dialogs with live previews", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminCardCatalog decks={buildDecks()} gameTitles={gameTitles} globalIssues={[]} />);

    await user.click(screen.getAllByRole("button", { name: /edit deck/i })[0]!);
    const deckDialog = screen.getByRole("dialog");
    expect(within(deckDialog).getByText("Live deck preview")).toBeInTheDocument();
    await user.clear(within(deckDialog).getByLabelText("Common %"));
    await user.type(within(deckDialog).getByLabelText("Common %"), "60");
    expect(within(deckDialog).getByText("90% / 100%")).toHaveClass("text-destructive");
    expect(within(deckDialog).getByRole("button", { name: "Save deck" })).toBeDisabled();
    await user.click(within(deckDialog).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getAllByRole("button", { name: /show cards/i })[0]!);
    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    const cardDialog = screen.getByRole("dialog");
    expect(within(cardDialog).getByText("Live card preview")).toBeInTheDocument();
    expect(within(cardDialog).getByDisplayValue("Six-Sided Die")).toBeInTheDocument();
    expect(within(cardDialog).getByText("Artwork is owned by code")).toBeInTheDocument();
    expect(within(cardDialog).queryByLabelText("Renderer")).not.toBeInTheDocument();
    expect(within(cardDialog).queryByLabelText("Card accent")).not.toBeInTheDocument();
  });
});
