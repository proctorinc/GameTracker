"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { loadUser } from "@/lib/auth/protected-session";
import { validateDeckOdds } from "@/lib/card-catalog";
import { cardRarities, db, decks, gameTitle } from "@/lib/db";
import { deckBackConfigSchema } from "@/lib/card-deck-style";
import { getCodedCardDefinition } from "@/lib/card-definitions";
import {
  cardTemplateHasIssuedCards,
  createCardTemplate,
  getCardTemplateById,
  updateCardTemplate,
} from "@/lib/db/store/card-templates.store";
import { getDeckByName } from "@/lib/db/store/decks.store";
import { revalidateCardCatalog } from "@/lib/cache-invalidation";

async function requireAdmin() {
  const { user } = await loadUser();
  if (!user || user.role !== "admin") throw new Error("Admin access required");
  return user;
}

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function integerField(formData: FormData, name: string) {
  const value = Number(field(formData, name));
  if (!Number.isInteger(value)) throw new Error(`${name} must be a whole number`);
  return value;
}

function slug(value: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error("Slugs may contain lowercase letters, numbers, and single hyphens");
  }
  return value;
}

function refreshCatalog() {
  revalidateCardCatalog();
  revalidatePath("/admin/cards");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/card/pull");
}

export async function saveCardDeck(formData: FormData) {
  await requireAdmin();
  const name = slug(field(formData, "name"));
  const existing = await getDeckByName(name);
  const isActive = formData.get("isActive") === "on";
  if (name === "standard" && !isActive) throw new Error("The Standard fallback deck must remain active");
  const selectedGameTitleIds = Array.from(
    new Set(formData.getAll("gameTitleIds").map((value) => String(value).trim()).filter(Boolean)),
  );
  if (!isActive && selectedGameTitleIds.length > 0) {
    throw new Error("Inactive decks cannot be assigned to games");
  }
  const odds = validateDeckOdds({
    common: integerField(formData, "commonOdds"),
    uncommon: integerField(formData, "uncommonOdds"),
    rare: integerField(formData, "rareOdds"),
    legendary: integerField(formData, "legendaryOdds"),
  });
  const values = {
    label: field(formData, "label"),
    description: field(formData, "description"),
    isActive,
    packSize: integerField(formData, "packSize"),
    commonOdds: odds.common,
    uncommonOdds: odds.uncommon,
    rareOdds: odds.rare,
    legendaryOdds: odds.legendary,
    ...(() => {
      const parsed = deckBackConfigSchema.safeParse({
        backStyle: field(formData, "backStyle"),
        backPrimaryColor: field(formData, "backPrimaryColor"),
        backSecondaryColor: field(formData, "backSecondaryColor"),
        backAccentColor: field(formData, "backAccentColor"),
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid deck-back style");
      return parsed.data;
    })(),
    updatedAt: new Date().toISOString(),
  };
  if (!values.label) throw new Error("Deck label is required");
  if (values.packSize < 1 || values.packSize > 10) throw new Error("Pack size must be between 1 and 10");
  const selectedTitles = selectedGameTitleIds.length
    ? await db.query.gameTitle.findMany({
        where: and(
          inArray(gameTitle.id, selectedGameTitleIds),
          isNull(gameTitle.mergedIntoGameTitleId),
        ),
        columns: { id: true },
      })
    : [];
  if (selectedTitles.length !== selectedGameTitleIds.length) {
    throw new Error("One or more selected game titles are unavailable");
  }

  await db.transaction(async (tx) => {
    if (existing) {
      await tx.update(decks).set(values).where(eq(decks.name, name));
    } else {
      await tx.insert(decks).values({ name, ...values });
    }
    await tx
      .update(gameTitle)
      .set({ rewardDeckName: null })
      .where(eq(gameTitle.rewardDeckName, name));
    if (selectedGameTitleIds.length > 0) {
      await tx
        .update(gameTitle)
        .set({ rewardDeckName: name })
        .where(inArray(gameTitle.id, selectedGameTitleIds));
    }
  });
  refreshCatalog();
}

export async function saveCardTemplate(formData: FormData) {
  await requireAdmin();
  const id = field(formData, "id");
  const existing = id ? await getCardTemplateById(id) : null;
  const deckName = field(formData, "deckName");
  const templateSlug = slug(field(formData, "slug"));
  const rarity = field(formData, "rarity");
  if (!cardRarities.includes(rarity as (typeof cardRarities)[number])) throw new Error("Invalid rarity");
  const deck = await getDeckByName(deckName);
  if (!deck) throw new Error("Deck not found");
  const definition = getCodedCardDefinition(deckName, templateSlug);
  if (!definition) {
    throw new Error("This card has no coded artwork definition. Add it in src/lib/card-definitions.ts first");
  }
  const values = {
    deckName,
    slug: templateSlug,
    name: field(formData, "templateName"),
    description: field(formData, "templateDescription"),
    rarity: rarity as (typeof cardRarities)[number],
    renderer: definition.renderer,
    configJson: JSON.stringify(definition.config),
    sortOrder: integerField(formData, "sortOrder"),
    isActive: formData.get("templateIsActive") === "on",
  };
  if (!values.name) throw new Error("Template name is required");
  if (existing) {
    if (await cardTemplateHasIssuedCards(existing.id)) {
      if (
        existing.deckName !== values.deckName ||
        existing.slug !== values.slug
      ) {
        throw new Error("Issued templates cannot change deck or coded card definition");
      }
    }
    await updateCardTemplate(existing.id, values);
  } else {
    await createCardTemplate(values);
  }
  refreshCatalog();
}

export async function setGameTitleRewardDeck(formData: FormData) {
  await requireAdmin();
  const gameTitleId = field(formData, "gameTitleId");
  const deckName = field(formData, "rewardDeckName");
  if (deckName) {
    const deck = await getDeckByName(deckName);
    if (!deck?.isActive) throw new Error("Only active decks can be assigned");
  }
  await db
    .update(gameTitle)
    .set({ rewardDeckName: deckName || null })
    .where(eq(gameTitle.id, gameTitleId));
  refreshCatalog();
}
