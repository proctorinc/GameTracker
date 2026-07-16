import { DEFAULT_DECK_BACK, isDeckBackConfigValid } from "@/lib/card-deck-style";
import { getCodedCardDefinition } from "@/lib/card-definitions";
import {
  CARD_RARITIES,
  parseCardRendererConfig,
  type CardRendererConfig,
  type CollectibleCardViewModel,
} from "@/lib/card-catalog";
import type { listDecksWithTemplates } from "@/lib/db/store/decks.store";
import type { CardRarity, DeckBackStyle } from "@/lib/db/schema";

type RawDeck = Awaited<ReturnType<typeof listDecksWithTemplates>>[number];
type RawTemplate = RawDeck["templates"][number];

export type CatalogIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
};

export type AdminCardTemplateView = RawTemplate & {
  hasIssuedCards: boolean;
  config: CardRendererConfig;
  preview: CollectibleCardViewModel;
  issues: CatalogIssue[];
};

export type AdminDeckView = Omit<RawDeck, "templates"> & {
  backStyle: DeckBackStyle;
  templates: AdminCardTemplateView[];
  issues: CatalogIssue[];
};

function fallbackConfig(renderer: RawTemplate["renderer"]): CardRendererConfig {
  if (renderer === "game_piece") return { piece: "playing-card", accent: "#7c3aed" };
  if (renderer === "skyjo_number") return { value: 0 };
  return {};
}

function templateView(
  deck: RawDeck,
  template: RawTemplate,
  issuedTemplateIds: ReadonlySet<string>,
): AdminCardTemplateView {
  const issues: CatalogIssue[] = [];
  let config = fallbackConfig(template.renderer);
  const definition = getCodedCardDefinition(deck.name, template.slug);
  try {
    config = parseCardRendererConfig(template.renderer, template.configJson);
  } catch (error) {
    issues.push({
      code: "invalid-renderer-config",
      severity: "error",
      message: error instanceof Error ? error.message : "Card renderer configuration is invalid",
    });
  }
  if (!definition) {
    issues.push({
      code: "missing-coded-definition",
      severity: "error",
      message: "No code-owned artwork definition exists for this card",
    });
  } else {
    const codedConfigJson = JSON.stringify(definition.config);
    if (template.renderer !== definition.renderer || template.configJson !== codedConfigJson) {
      issues.push({
        code: "coded-definition-drift",
        severity: "error",
        message: "Stored artwork differs from its code definition; run the card catalog seed",
      });
    }
    config = definition.config as CardRendererConfig;
  }
  if (!template.isActive) {
    issues.push({ code: "inactive-template", severity: "warning", message: "This card is inactive" });
  }

  return {
    ...template,
    renderer: definition?.renderer ?? template.renderer,
    hasIssuedCards: issuedTemplateIds.has(template.id),
    config,
    issues,
    preview: {
      instanceId: null,
      identityKey: `admin:${template.id}`,
      deckName: deck.name,
      deckLabel: deck.label,
      templateId: template.id,
      templateSlug: template.slug,
      name: template.name,
      description: template.description,
      rarity: template.rarity,
      renderer: definition?.renderer ?? template.renderer,
      config,
      subjectType: null,
      subjectId: null,
      subject: null,
      unavailable: false,
      collected: false,
      quantity: 0,
    },
  };
}

export function buildAdminDeckViews(
  decks: RawDeck[],
  issuedTemplateIds: ReadonlySet<string>,
): AdminDeckView[] {
  return decks.map((deck) => {
    const templates = deck.templates.map((template) =>
      templateView(deck, template, issuedTemplateIds),
    );
    const issues: CatalogIssue[] = [];
    const odds = {
      common: deck.commonOdds,
      uncommon: deck.uncommonOdds,
      rare: deck.rareOdds,
      legendary: deck.legendaryOdds,
    } satisfies Record<CardRarity, number>;
    const oddsTotal = Object.values(odds).reduce((sum, value) => sum + value, 0);
    if (oddsTotal !== 100 || Object.values(odds).some((value) => value < 0)) {
      issues.push({
        code: "invalid-odds",
        severity: "error",
        message: `Rarity odds total ${oddsTotal}%; they must be non-negative and total 100%`,
      });
    }
    if (
      !isDeckBackConfigValid({
        backStyle: deck.backStyle,
        backPrimaryColor: deck.backPrimaryColor,
        backSecondaryColor: deck.backSecondaryColor,
        backAccentColor: deck.backAccentColor,
      })
    ) {
      issues.push({
        code: "invalid-deck-style",
        severity: "error",
        message: "The deck-back style or colors are invalid",
      });
    }

    const eligibleTemplates = templates.filter(
      (template) =>
        template.isActive && !template.issues.some((issue) => issue.severity === "error"),
    );
    if (deck.isActive && eligibleTemplates.length === 0) {
      issues.push({ code: "empty-deck", severity: "error", message: "Active deck has no usable active cards" });
    }
    for (const rarity of CARD_RARITIES) {
      if (odds[rarity] > 0 && !eligibleTemplates.some((template) => template.rarity === rarity)) {
        issues.push({
          code: `missing-${rarity}`,
          severity: "error",
          message: `${odds[rarity]}% ${rarity} odds are configured, but no usable active ${rarity} card exists`,
        });
      }
    }
    if (!deck.isActive) {
      issues.push({ code: "inactive-deck", severity: "warning", message: "This deck is inactive" });
    }
    if (!deck.rewardGameTitles.length) {
      issues.push({ code: "no-games", severity: "warning", message: "No games explicitly use this deck" });
    }
    if (!deck.isActive && deck.rewardGameTitles.length > 0) {
      issues.push({
        code: "inactive-assigned-deck",
        severity: "error",
        message: `${deck.rewardGameTitles.length} game(s) are assigned to this inactive deck`,
      });
    }
    const inactiveCount = templates.filter((template) => !template.isActive).length;
    if (inactiveCount > 0) {
      issues.push({
        code: "inactive-cards",
        severity: "warning",
        message: `${inactiveCount} card template${inactiveCount === 1 ? " is" : "s are"} inactive`,
      });
    }
    for (const template of templates) {
      issues.push(
        ...template.issues
          .filter((issue) => issue.severity === "error")
          .map((issue) => ({ ...issue, code: `${template.id}:${issue.code}`, message: `${template.name}: ${issue.message}` })),
      );
    }

    return {
      ...deck,
      backStyle: isDeckBackConfigValid({
        backStyle: deck.backStyle,
        backPrimaryColor: deck.backPrimaryColor,
        backSecondaryColor: deck.backSecondaryColor,
        backAccentColor: deck.backAccentColor,
      })
        ? deck.backStyle
        : DEFAULT_DECK_BACK.backStyle,
      templates,
      issues,
    };
  });
}
