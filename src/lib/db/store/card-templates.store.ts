import { and, asc, eq, isNotNull } from "drizzle-orm";
import { cardTemplates, cards, db } from "../index";

export type CardTemplateBase = typeof cardTemplates.$inferSelect;
export type CardTemplateInsert = typeof cardTemplates.$inferInsert;
export type CardTemplateUpdate = Partial<
  Omit<CardTemplateInsert, "id" | "createdAt">
>;

export async function listCardTemplates(input?: {
  deckName?: string;
  activeOnly?: boolean;
}) {
  const conditions = [];
  if (input?.deckName) conditions.push(eq(cardTemplates.deckName, input.deckName));
  if (input?.activeOnly) conditions.push(eq(cardTemplates.isActive, true));
  return db.query.cardTemplates.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [asc(cardTemplates.sortOrder), asc(cardTemplates.name)],
    with: { deck: true },
  });
}

export async function getCardTemplateById(id: string) {
  return (
    (await db.query.cardTemplates.findFirst({
      where: eq(cardTemplates.id, id),
      with: { deck: true },
    })) ?? null
  );
}

export async function createCardTemplate(input: CardTemplateInsert) {
  const [template] = await db.insert(cardTemplates).values(input).returning();
  return template;
}

export async function updateCardTemplate(id: string, input: CardTemplateUpdate) {
  const [template] = await db
    .update(cardTemplates)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(cardTemplates.id, id))
    .returning();
  return template ?? null;
}

export async function cardTemplateHasIssuedCards(id: string) {
  return Boolean(
    await db.query.cards.findFirst({
      where: eq(cards.cardTemplateId, id),
      columns: { id: true },
    }),
  );
}

export async function listIssuedCardTemplateIds() {
  const rows = await db
    .selectDistinct({ id: cards.cardTemplateId })
    .from(cards)
    .where(isNotNull(cards.cardTemplateId));
  return rows.flatMap((row) => (row.id ? [row.id] : []));
}
