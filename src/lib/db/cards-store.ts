import { eq } from "drizzle-orm";
import { db, cards as cardSchema } from "./index";
import { UserRow } from "../auth";

export type CardRow = typeof cardSchema.$inferSelect & {
  owner: UserRow;
};

function nowIso(): string {
  return new Date().toISOString();
}

const CARD_VALUE_CHANCES: Record<number, number> = {
  // Negatives: 5%
  [-2]: 0.02,
  [-1]: 0.03,
  // Zero: 4%
  [0]:  0.04,
  // Greens: 25%
  [1]:  0.06,
  [2]:  0.06,
  [3]:  0.06,
  [4]:  0.07,
  // Yellows: 30%
  [5]:  0.07,
  [6]:  0.07,
  [7]:  0.08,
  [8]:  0.08,
  // Reds: 36%
  [9]:  0.08,
  [10]: 0.09,
  [11]: 0.09,
  [12]: 0.10,
};

const DROP_CONFIG = {
  holographicChance: 0.05,
  defaultDeck: "standard"
};

(function validateChances() {
  const totalChances = Object.values(CARD_VALUE_CHANCES).reduce((sum, val) => sum + Math.floor(val * 100), 0);
  
  // Using an epsilon check (0.0001) to account for JavaScript floating-point rounding quirks
  if (Math.abs(totalChances - 100) > 0.0001) {
    throw new Error(
      `[Card Generator Config Error]: Total card value chances must equal exactly 1.0 (100%). Current total is ${totalChances * 100}%.`
    );
  }
})();

function pickPercentBasedValue(chancesMap: Record<number, number>): number {
  const entries = Object.entries(chancesMap).map(([val, chance]) => ({
    value: Number(val),
    chance
  }));
  
  let roll = Math.random();

  for (const item of entries) {
    if (roll < item.chance) {
      return item.value;
    }
    roll -= item.chance;
  }
  
  return entries[entries.length - 1].value;
}

function getProbability(val: number, isHolographic: boolean) {
  return CARD_VALUE_CHANCES[val] * (isHolographic ? DROP_CONFIG.holographicChance : 1)
}

function getSuitProbability(val: number) {
  let percent = 0;

  if (val < 0) {
    percent = CARD_VALUE_CHANCES[-1] + CARD_VALUE_CHANCES[-2];
  } else if (val === 0) {
    percent = CARD_VALUE_CHANCES[0];
  } else if (val <= 4) {
    percent = CARD_VALUE_CHANCES[1] + CARD_VALUE_CHANCES[2] + CARD_VALUE_CHANCES[3] + CARD_VALUE_CHANCES[4];
  } else if (val <= 8) {
    percent = CARD_VALUE_CHANCES[5] + CARD_VALUE_CHANCES[6] + CARD_VALUE_CHANCES[7] + CARD_VALUE_CHANCES[8];
  } else {
    percent = CARD_VALUE_CHANCES[9] + CARD_VALUE_CHANCES[10] + CARD_VALUE_CHANCES[11] + CARD_VALUE_CHANCES[12];
  }

  return percent;
}

function getSuit(val: number) {
  if (val < 0) {
    return "DARK_BLUE"
  } else if (val === 0) {
    return "LIGHT_BLUE"
  } else if (val <= 4) {
    return "GREEN"
  } else if (val <= 8) {
    return "YELLOW"
  } else {
    return "RED"
  }
}

export function generateSingleCardDrop(): Omit<CardRow, 'id' | 'created_at' | 'owner_id' | 'owner'> {
  const selectedValue = pickPercentBasedValue(CARD_VALUE_CHANCES);
  const isHolographic = Math.random() < DROP_CONFIG.holographicChance;

  return {
    value: selectedValue,
    suit: getSuit(selectedValue),
    modifier: isHolographic ? "Holographic" : "Basic",
    weight: selectedValue * 100 + (isHolographic ? 10 : 0),
    deck: DROP_CONFIG.defaultDeck,
    probability: getProbability(selectedValue, isHolographic),
    suit_probability: getSuitProbability(selectedValue),
  };
}

export async function createUserCard(
  userId: string,
  options?: {
    value?: number;
    modifier?: string;
    deck?: string;
  }
): Promise<CardRow> {
  const generated = generateSingleCardDrop();

  if (options?.value !== undefined) {
    generated.value = options.value;
  }
  if (options?.modifier !== undefined) {
    generated.modifier = options.modifier;
  }
  if (options?.deck !== undefined) {
    generated.deck = options.deck;
  }

  const [createdCard] = await db.insert(cardSchema).values({
    ...generated,
    owner_id: userId,
    created_at: nowIso()
  }).returning();

  const card = await getCardById(createdCard.id);

  if (!card) throw new Error("Failed to create card");

  return card;
}

export async function getCardById(id: string): Promise<CardRow | null> {
  const card = await db.query.cards.findFirst({
    where: eq(cardSchema.id, id),
    with: {
      owner: true,
    },
  });
  return card ?? null;
}

export async function getUserCards(userId: string): Promise<CardRow[]> {
  return db.query.cards.findMany({
    where: eq(cardSchema.owner_id, userId),
    with: {
      owner: true,
    }
  });
}