import { eq } from "drizzle-orm";
import { db, decks } from "../index";

export type DeckBase = typeof decks.$inferSelect;
export type DeckInsert = typeof decks.$inferInsert;
export type DeckUpdate = Partial<Omit<DeckInsert, "name">>;
export type DeckWithCards = DeckBase & {
  cards: Array<typeof db._.fullSchema.cards.$inferSelect>;
};
export type DeckWithCardDrops = DeckBase & {
  cardDrops: Array<typeof db._.fullSchema.cardDrops.$inferSelect>;
};
export type DeckFull = DeckBase & {
  cards: Array<typeof db._.fullSchema.cards.$inferSelect>;
  cardDrops: Array<typeof db._.fullSchema.cardDrops.$inferSelect>;
};

export async function createDeck(input: DeckInsert): Promise<DeckBase> {
  const [deck] = await db.insert(decks).values(input).returning();
  return deck;
}

export async function getDeckByName(name: string): Promise<DeckBase | null> {
  const deck = await db.query.decks.findFirst({
    where: eq(decks.name, name),
  });

  return deck ?? null;
}

export async function getDeckFullByName(
  name: string,
): Promise<DeckFull | null> {
  const deck = await db.query.decks.findFirst({
    where: eq(decks.name, name),
    with: {
      cards: true,
      cardDrops: true,
    },
  });

  return deck ?? null;
}

export async function listDecks(): Promise<DeckBase[]> {
  return db.query.decks.findMany();
}

export async function updateDeck(
  name: string,
  input: DeckUpdate,
): Promise<DeckBase | null> {
  const [deck] = await db
    .update(decks)
    .set(input)
    .where(eq(decks.name, name))
    .returning();

  return deck ?? null;
}

export async function deleteDeck(name: string): Promise<DeckBase | null> {
  const [deck] = await db.delete(decks).where(eq(decks.name, name)).returning();
  return deck ?? null;
}
