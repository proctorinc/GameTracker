import { and, eq, isNull } from "drizzle-orm";
import { cards, db } from "../index";
import type { CardRarity } from "../schema";

export type CardBase = typeof cards.$inferSelect;
export type CardInsert = typeof cards.$inferInsert;
export type CardUpdate = Partial<Omit<CardInsert, "id" | "createdAt">>;
export type CardRow = CardBase;
export type CardFull = Omit<CardBase, "cardTemplateId" | "rarity"> & {
  cardTemplateId: string;
  rarity: CardRarity;
  owner: typeof db._.fullSchema.users.$inferSelect;
  deck: typeof db._.fullSchema.decks.$inferSelect;
  template: typeof db._.fullSchema.cardTemplates.$inferSelect;
};

export async function createCard(input: CardInsert): Promise<CardBase> {
  const [card] = await db.insert(cards).values(input).returning();
  return card;
}

export async function getCardById(id: string): Promise<CardBase | null> {
  return (
    (await db.query.cards.findFirst({ where: eq(cards.id, id) })) ?? null
  );
}

export async function getCardFullById(id: string): Promise<CardFull | null> {
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, id),
    with: { owner: true, deck: true, template: true },
  });
  if (!card?.cardTemplateId || !card.rarity || !card.template) return null;
  return card as CardFull;
}

export async function listCards(): Promise<CardBase[]> {
  return db.query.cards.findMany();
}

export async function getCardsByOwnerId(ownerId: string) {
  const rows = await db.query.cards.findMany({
    where: eq(cards.ownerId, ownerId),
    with: { deck: true, template: true },
  });
  return rows.filter(
    (row): row is typeof row & {
      cardTemplateId: string;
      rarity: CardRarity;
      template: NonNullable<typeof row.template>;
    } => Boolean(row.cardTemplateId && row.rarity && row.template),
  );
}

export async function getCardsByDeckName(deckName: string) {
  return db.query.cards.findMany({
    where: eq(cards.deckName, deckName),
    with: { template: true },
  });
}

export async function getOwnedCardByIdentity(input: {
  ownerId: string;
  cardTemplateId: string;
  subjectId?: string | null;
}) {
  return (
    (await db.query.cards.findFirst({
      where: and(
        eq(cards.ownerId, input.ownerId),
        eq(cards.cardTemplateId, input.cardTemplateId),
        input.subjectId
          ? eq(cards.subjectId, input.subjectId)
          : isNull(cards.subjectId),
      ),
    })) ?? null
  );
}

export async function updateCard(id: string, input: CardUpdate) {
  const [card] = await db.update(cards).set(input).where(eq(cards.id, id)).returning();
  return card ?? null;
}

export async function deleteCard(id: string) {
  const [card] = await db.delete(cards).where(eq(cards.id, id)).returning();
  return card ?? null;
}

export async function createUserCard(
  userId: string,
  input: Pick<CardInsert, "deckName" | "cardTemplateId" | "rarity"> &
    Partial<Pick<CardInsert, "subjectType" | "subjectId">>,
) {
  return createCard({
    ownerId: userId,
    value: 0,
    suit: "CATALOG",
    weight: 0,
    probability: 0,
    suitProbability: 0,
    ...input,
  });
}
