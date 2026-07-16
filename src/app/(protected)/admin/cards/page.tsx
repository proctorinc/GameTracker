import { requireAdminPageUser } from "../admin-guard";
import { AdminCardCatalog } from "@/components/admin/admin-card-catalog";
import { buildAdminDeckViews, type CatalogIssue } from "@/lib/admin-card-catalog";
import { listIssuedCardTemplateIds } from "@/lib/db/store/card-templates.store";
import { listDecksWithTemplates } from "@/lib/db/store/decks.store";
import { listAllGameTitles } from "@/lib/db/store/game.store";

export default async function AdminCardsPage() {
  await requireAdminPageUser();
  const [rawDecks, titles, issuedTemplateIds] = await Promise.all([
    listDecksWithTemplates(),
    listAllGameTitles(),
    listIssuedCardTemplateIds(),
  ]);
  const decks = buildAdminDeckViews(rawDecks, new Set(issuedTemplateIds));
  const deckByName = new Map(decks.map((deck) => [deck.name, deck]));
  const globalIssues: CatalogIssue[] = titles.flatMap((title) => {
    if (!title.rewardDeckName) return [];
    const deck = deckByName.get(title.rewardDeckName);
    if (!deck) {
      return [{ code: `missing-deck:${title.id}`, severity: "error" as const, message: `${title.title} points to a missing deck` }];
    }
    if (!deck.isActive) {
      return [{ code: `inactive-deck:${title.id}`, severity: "error" as const, message: `${title.title} points to inactive deck ${deck.label}` }];
    }
    return [];
  });

  return (
    <AdminCardCatalog
      decks={decks}
      gameTitles={titles.map((title) => ({
        id: title.id,
        title: title.title,
        normalizedTitle: title.normalizedTitle,
        rewardDeckName: title.rewardDeckName,
      }))}
      globalIssues={globalIssues}
    />
  );
}
