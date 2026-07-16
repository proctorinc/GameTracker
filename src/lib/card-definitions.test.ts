import { describe, expect, it } from "vitest";
import { SKYJO_CARD_DEFINITIONS } from "./card-definitions";

describe("Skyjo coded card definitions", () => {
  it("defines the complete -2 through 12 number deck in order", () => {
    expect(SKYJO_CARD_DEFINITIONS).toHaveLength(15);
    expect(SKYJO_CARD_DEFINITIONS.map((card) => card.config.value)).toEqual(
      Array.from({ length: 15 }, (_, index) => index - 2),
    );
    expect(SKYJO_CARD_DEFINITIONS.every((card) => card.renderer === "skyjo_number")).toBe(true);
  });

  it("keeps the previous rarity bands", () => {
    const rarityByValue = Object.fromEntries(
      SKYJO_CARD_DEFINITIONS.map((card) => [String(card.config.value), card.rarity]),
    );
    expect(rarityByValue).toMatchObject({
      "-2": "legendary",
      "-1": "rare",
      "0": "rare",
      "1": "uncommon",
      "4": "uncommon",
      "5": "common",
      "12": "common",
    });
  });
});
