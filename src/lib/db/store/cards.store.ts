import { eq } from "drizzle-orm";
import { db, cards } from "../index";

export type CardBase = typeof cards.$inferSelect;
export type CardInsert = typeof cards.$inferInsert;
export type CardUpdate = Partial<Omit<CardInsert, "id">>;
export type CardWithOwner = CardBase & {
  owner: typeof db._.fullSchema.users.$inferSelect;
};
export type CardWithDeck = CardBase & {
  deck: typeof db._.fullSchema.decks.$inferSelect | null;
};
export type CardFull = CardBase & {
  owner: typeof db._.fullSchema.users.$inferSelect;
  deck: typeof db._.fullSchema.decks.$inferSelect | null;
};
export type CardRow = CardBase;

const CARD_VALUE_WEIGHTS: Record<number, number> = {
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

function nowIso() {
  return new Date().toISOString();
}

function pickWeightedValue() {
  const entries = Object.entries(CARD_VALUE_WEIGHTS).map(([value, weight]) => ({
    value: Number(value),
    weight,
  }));
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.floor(Math.random() * totalWeight);

  for (const entry of entries) {
    if (roll < entry.weight) {
      return entry.value;
    }
    roll -= entry.weight;
  }

  return entries[entries.length - 1].value;
}

function getSuit(value: number) {
  if (value < 0) return "DARK_BLUE";
  if (value === 0) return "LIGHT_BLUE";
  if (value <= 4) return "GREEN";
  if (value <= 8) return "YELLOW";
  return "RED";
}

function getSuitProbability(value: number) {
  if (value < 0) return CARD_VALUE_WEIGHTS[-2] + CARD_VALUE_WEIGHTS[-1];
  if (value === 0) return CARD_VALUE_WEIGHTS[0];
  if (value <= 4)
    return (
      CARD_VALUE_WEIGHTS[1] +
      CARD_VALUE_WEIGHTS[2] +
      CARD_VALUE_WEIGHTS[3] +
      CARD_VALUE_WEIGHTS[4]
    );
  if (value <= 8)
    return (
      CARD_VALUE_WEIGHTS[5] +
      CARD_VALUE_WEIGHTS[6] +
      CARD_VALUE_WEIGHTS[7] +
      CARD_VALUE_WEIGHTS[8]
    );
  return (
    CARD_VALUE_WEIGHTS[9] +
    CARD_VALUE_WEIGHTS[10] +
    CARD_VALUE_WEIGHTS[11] +
    CARD_VALUE_WEIGHTS[12]
  );
}

export function generateSingleCardDrop(): Omit<
  CardInsert,
  "id" | "ownerId" | "createdAt"
> {
  const value = pickWeightedValue();
  return {
    deckName: "standard",
    value,
    suit: getSuit(value),
    weight: value * 100,
    modifier: "Basic",
    probability: CARD_VALUE_WEIGHTS[value],
    suitProbability: getSuitProbability(value),
  };
}

export async function createCard(input: CardInsert): Promise<CardBase> {
  const [card] = await db
    .insert(cards)
    .values({
      ...input,
      createdAt: input.createdAt ?? nowIso(),
    })
    .returning();

  return card;
}

export async function getCardById(id: string): Promise<CardBase | null> {
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, id),
  });

  return card ?? null;
}

export async function getCardFullById(id: string): Promise<CardFull | null> {
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, id),
    with: {
      owner: true,
      deck: true,
    },
  });

  return card ?? null;
}

export async function listCards(): Promise<CardBase[]> {
  return db.query.cards.findMany();
}

export async function getCardsByOwnerId(ownerId: string): Promise<CardBase[]> {
  return db.query.cards.findMany({
    where: eq(cards.ownerId, ownerId),
  });
}

export async function getCardsByDeckName(
  deckName: string,
): Promise<CardBase[]> {
  return db.query.cards.findMany({
    where: eq(cards.deckName, deckName),
  });
}

export async function updateCard(
  id: string,
  input: CardUpdate,
): Promise<CardBase | null> {
  const [card] = await db
    .update(cards)
    .set(input)
    .where(eq(cards.id, id))
    .returning();

  return card ?? null;
}

export async function deleteCard(id: string): Promise<CardBase | null> {
  const [card] = await db.delete(cards).where(eq(cards.id, id)).returning();
  return card ?? null;
}

export async function createUserCard(
  userId: string,
  input?: Partial<Pick<CardInsert, "value" | "modifier" | "deckName">>,
): Promise<CardRow> {
  const generated = generateSingleCardDrop();
  const created = await createCard({
    ...generated,
    ownerId: userId,
    deckName: input?.deckName ?? generated.deckName,
    value: input?.value ?? generated.value,
    modifier: input?.modifier ?? generated.modifier,
    suit: getSuit(input?.value ?? generated.value),
    weight: (input?.value ?? generated.value) * 100,
    probability: CARD_VALUE_WEIGHTS[input?.value ?? generated.value],
    suitProbability: getSuitProbability(input?.value ?? generated.value),
  });

  const card = await getCardFullById(created.id);
  if (!card) {
    throw new Error("Failed to load created card");
  }

  return card;
}
