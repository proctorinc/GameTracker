import { and, eq, isNull, sql } from "drizzle-orm";
import { cardTemplates, db, decks, gameTitle } from "@/lib/db";
import { CODED_CARD_DEFINITIONS } from "@/lib/card-definitions";

export async function seedCardCatalog() {
  await db.transaction(async (tx) => {
    await tx
      .insert(decks)
      .values([
        {
          name: "standard",
          label: "Score Loser",
          description: "Game-night treasures, friends, and memories from the table.",
        },
        {
          name: "skyjo",
          label: "Skyjo",
          description: "The complete numeric Skyjo collection.",
        },
      ])
      .onConflictDoUpdate({
        target: decks.name,
        set: {
          label: sql`case when ${decks.label} = 'Deck' then excluded.label else ${decks.label} end`,
          description: sql`case when ${decks.description} = '' then excluded.description else ${decks.description} end`,
          updatedAt: new Date().toISOString(),
        },
      });

    for (const template of CODED_CARD_DEFINITIONS) {
      await tx
        .insert(cardTemplates)
        .values({
          deckName: template.deckName,
          slug: template.slug,
          name: template.name,
          description: template.description,
          rarity: template.rarity,
          renderer: template.renderer,
          configJson: JSON.stringify(template.config),
          sortOrder: template.sortOrder,
        })
        .onConflictDoUpdate({
          target: [cardTemplates.deckName, cardTemplates.slug],
          set: {
            renderer: template.renderer,
            configJson: JSON.stringify(template.config),
            updatedAt: new Date().toISOString(),
          },
        });
    }

    await tx
      .update(gameTitle)
      .set({ rewardDeckName: "skyjo" })
      .where(and(eq(gameTitle.normalizedTitle, "skyjo"), isNull(gameTitle.rewardDeckName)));
  });
}
