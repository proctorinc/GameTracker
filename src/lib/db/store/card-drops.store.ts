import { eq } from "drizzle-orm";
import { cardDrops, db } from "../index";

export type CardDropBase = typeof cardDrops.$inferSelect;
export type CardDropInsert = typeof cardDrops.$inferInsert;
export type CardDropUpdate = Partial<Omit<CardDropInsert, "id">>;
export type CardDropWithUser = CardDropBase & {
  user: typeof db._.fullSchema.users.$inferSelect;
};
export type CardDropWithGame = CardDropBase & {
  game: typeof db._.fullSchema.games.$inferSelect | null;
};
export type CardDropWithDeck = CardDropBase & {
  deck: typeof db._.fullSchema.decks.$inferSelect | null;
};
export type CardDropFull = CardDropBase & {
  user: typeof db._.fullSchema.users.$inferSelect;
  game: typeof db._.fullSchema.games.$inferSelect | null;
  deck: typeof db._.fullSchema.decks.$inferSelect | null;
};

export async function createCardDrop(
  input: CardDropInsert,
): Promise<CardDropBase> {
  const [cardDrop] = await db.insert(cardDrops).values(input).returning();
  return cardDrop;
}

export async function getCardDropById(
  id: string,
): Promise<CardDropBase | null> {
  const cardDrop = await db.query.cardDrops.findFirst({
    where: eq(cardDrops.id, id),
  });

  return cardDrop ?? null;
}

export async function getCardDropFullById(
  id: string,
): Promise<CardDropFull | null> {
  const cardDrop = await db.query.cardDrops.findFirst({
    where: eq(cardDrops.id, id),
    with: {
      user: true,
      game: true,
      deck: true,
    },
  });

  return cardDrop ?? null;
}

export async function listCardDrops(): Promise<CardDropBase[]> {
  return db.query.cardDrops.findMany();
}

export async function getCardDropsByUserId(
  userId: string,
): Promise<CardDropBase[]> {
  return db.query.cardDrops.findMany({
    where: eq(cardDrops.userId, userId),
  });
}

export async function getCardDropsByGameId(
  gameId: string,
): Promise<CardDropBase[]> {
  return db.query.cardDrops.findMany({
    where: eq(cardDrops.gameId, gameId),
  });
}

export async function updateCardDrop(
  id: string,
  input: CardDropUpdate,
): Promise<CardDropBase | null> {
  const [cardDrop] = await db
    .update(cardDrops)
    .set(input)
    .where(eq(cardDrops.id, id))
    .returning();

  return cardDrop ?? null;
}

export async function deleteCardDrop(id: string): Promise<CardDropBase | null> {
  const [cardDrop] = await db
    .delete(cardDrops)
    .where(eq(cardDrops.id, id))
    .returning();
  return cardDrop ?? null;
}
