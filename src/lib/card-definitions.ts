import type { CardRarity, CardRendererType } from "@/lib/db/schema";

export type CodedCardDefinition = {
  deckName: string;
  slug: string;
  name: string;
  description: string;
  rarity: CardRarity;
  renderer: CardRendererType;
  config: Record<string, unknown>;
  sortOrder: number;
};

const standardCards: CodedCardDefinition[] = [
  ["playing-card", "Playing Card", "The piece that started a thousand games.", "common", "playing-card"],
  ["six-sided-die", "Six-Sided Die", "A tiny engine of fate.", "common", "die"],
  ["meeple", "Meeple", "Always ready for the next turn.", "common", "meeple"],
  ["pawn", "Pawn", "Small, determined, and surprisingly competitive.", "common", "pawn"],
  ["domino", "Domino", "One half of a satisfying chain reaction.", "uncommon", "domino"],
  ["wooden-cube", "Wooden Cube", "A premium resource, probably.", "uncommon", "cube"],
  ["game-tile", "Game Tile", "A piece of a larger strategy.", "uncommon", "tile"],
  ["first-player-token", "First-Player Token", "Power that passes clockwise.", "uncommon", "first-player"],
  ["miniature", "Miniature", "A hero rendered at table scale.", "rare", "miniature"],
  ["friend-profile", "Friend Profile", "One of the people who makes game night matter.", "legendary", null],
  ["played-title", "Played Game", "A title from your own table history.", "legendary", null],
  ["golden-trophy", "Golden Trophy", "Proof that even losing can look magnificent.", "legendary", "trophy"],
].map(([slug, name, description, rarity, piece], index) => ({
  deckName: "standard",
  slug: slug as string,
  name: name as string,
  description: description as string,
  rarity: rarity as CardRarity,
  renderer:
    slug === "friend-profile"
      ? "friend_profile"
      : slug === "played-title"
        ? "played_title"
        : "game_piece",
  config: piece ? { piece, accent: rarity === "legendary" ? "#f59e0b" : "#7c3aed" } : {},
  sortOrder: index,
}));

function skyjoRarity(value: number): CardRarity {
  if (value === -2) return "legendary";
  if (value <= 0) return "rare";
  if (value <= 4) return "uncommon";
  return "common";
}

export const SKYJO_CARD_DEFINITIONS: readonly CodedCardDefinition[] = Array.from(
  { length: 15 },
  (_, index) => index - 2,
).map((value, index) => ({
  deckName: "skyjo",
  slug: `number-${value < 0 ? `minus-${Math.abs(value)}` : value}`,
  name: `Skyjo ${value}`,
  description: `The ${value} card from the Skyjo deck.`,
  rarity: skyjoRarity(value),
  renderer: "skyjo_number",
  config: { value },
  sortOrder: index,
}));

export const CODED_CARD_DEFINITIONS: readonly CodedCardDefinition[] = [
  ...standardCards,
  ...SKYJO_CARD_DEFINITIONS,
];

export function getCodedCardDefinitionsForDeck(deckName: string) {
  return CODED_CARD_DEFINITIONS.filter((definition) => definition.deckName === deckName);
}

export function getCodedCardDefinition(deckName: string, slug: string) {
  return CODED_CARD_DEFINITIONS.find(
    (definition) => definition.deckName === deckName && definition.slug === slug,
  );
}
