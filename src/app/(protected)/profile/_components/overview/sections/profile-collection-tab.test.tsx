import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../../../../../tests/helpers/render";
import type { CollectibleCardViewModel } from "@/lib/card-catalog";
import { ProfileCollectionTab } from "./profile-collection-tab";

function slot(input: Partial<CollectibleCardViewModel> = {}): CollectibleCardViewModel {
  return {
    instanceId: null,
    identityKey: "template:static:static",
    deckName: "standard",
    deckLabel: "Score Loser",
    templateId: "template",
    templateSlug: "meeple",
    name: "Meeple",
    description: "A game-night friend.",
    rarity: "common",
    renderer: "game_piece",
    config: { piece: "meeple", accent: "#7c3aed" },
    subjectType: null,
    subjectId: null,
    subject: null,
    unavailable: false,
    collected: false,
    quantity: 0,
    ...input,
  };
}

const collected = slot({
  instanceId: "card-1",
  collected: true,
  quantity: 2,
  rarity: "legendary",
});
const missing = slot({
  identityKey: "missing:static:static",
  templateId: "missing",
  templateSlug: "die",
  name: "Six-Sided Die",
  config: { piece: "die", accent: "#2563eb" },
});

vi.mock("../profile-overview-provider", () => ({
  useProfileOverview: () => ({
    data: {
      cardCollection: [
        {
          deckName: "standard",
          deckLabel: "Score Loser",
          totalCards: 2,
          collectedSlots: 1,
          eligibleSlots: 2,
          slots: [collected, missing],
        },
      ],
    },
  }),
}));

describe("ProfileCollectionTab", () => {
  it("renders compact owned and missing slots with deck progress", () => {
    const { container } = renderWithProviders(<ProfileCollectionTab />);
    expect(screen.getByText(/1 \/ 2 collected/)).toBeInTheDocument();
    expect(screen.getByText("×2")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-placeholder="true"]')).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Six-Sided Die/ })).not.toBeInTheDocument();
  });

  it("opens the single-card dialog for an owned slot", () => {
    renderWithProviders(<ProfileCollectionTab />);
    fireEvent.click(screen.getByRole("button", { name: /View Meeple, Legendary/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Score Loser · Legendary · 2 owned")).toBeInTheDocument();
  });
});
