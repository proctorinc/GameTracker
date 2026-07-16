export type CardDeckConfig = {
  name: string;
  label: string;
  description: string;
  gameTitleNames: readonly string[];
  valueWeights: Readonly<Record<number, number>>;
};

const NUMERIC_CARD_VALUE_WEIGHTS: Readonly<Record<number, number>> = {
  [-2]: 2,
  [-1]: 3,
  0: 4,
  1: 6,
  2: 6,
  3: 6,
  4: 7,
  5: 7,
  6: 7,
  7: 8,
  8: 8,
  9: 8,
  10: 9,
  11: 9,
  12: 10,
};

export const STANDARD_DECK_NAME = "standard";

export const CARD_DECK_CONFIGS: readonly CardDeckConfig[] = [
  {
    name: STANDARD_DECK_NAME,
    label: "Standard",
    description: "The collectible card pack earned from games without a custom deck.",
    gameTitleNames: [],
    valueWeights: NUMERIC_CARD_VALUE_WEIGHTS,
  },
  {
    name: "skyjo",
    label: "Skyjo",
    description: "Collectible cards earned by completing Skyjo games.",
    gameTitleNames: ["skyjo"],
    valueWeights: NUMERIC_CARD_VALUE_WEIGHTS,
  },
] as const;

export function getCardDeckConfigByName(deckName: string) {
  return (
    CARD_DECK_CONFIGS.find((deck) => deck.name === deckName) ??
    CARD_DECK_CONFIGS[0]
  );
}

export function resolveCardDeckForGameTitle(
  normalizedTitle: string | null | undefined,
) {
  const normalized = normalizedTitle?.trim().toLowerCase() ?? "";

  return (
    CARD_DECK_CONFIGS.find(
      (deck) =>
        deck.name !== STANDARD_DECK_NAME &&
        deck.gameTitleNames.includes(normalized),
    ) ?? CARD_DECK_CONFIGS[0]
  );
}
