"use client";

import { getProfileColorSurfaceStyles } from "@/components/profile/profile-color-styles";
import ProfilePicture from "@/components/profile/profile-picture";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { evaluateItemizedCategoryFormula } from "@/lib/game/itemized-scoring";
import {
  buildLostCitiesCategoryValues,
  getLostCitiesOrderedCategories,
  parseLostCitiesPersistedEntry,
} from "@/lib/game/lost-cities";
import {
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  FastForward,
  Flame,
  Leaf,
  ListChecks,
  Mountain,
  Pause,
  Play,
  Sparkles,
  Sun,
  Trophy,
  Waves,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { PlayGameV2ScreenProps, PlayGameV2SurfaceConfig } from "../types";
import {
  PlayGameV2BottomBar,
  PlayGameV2ManagePlayersDialogBody,
  PlayGameV2ShareDrawerBody,
  PlayGameV2Shell,
  formatPlayGameV2EndingSummary,
  formatPlayGameV2ScoringSummary,
  getPlayGameV2DisplayName,
} from "../shared";

const CARD_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const WAGER_VALUES = [0, 1, 2, 3] as const;

type Draft = {
  selectedValues: number[];
  subtotal: number;
  wagers: number;
};

type EditorState = { categoryId: string; userId: string };

function draftKey(userId: string, categoryId: string) {
  return `${userId}:${categoryId}`;
}

function emptyDraft(): Draft {
  return { selectedValues: [], subtotal: 0, wagers: 0 };
}

function scoreDraft(
  category: PlayGameV2ScreenProps["config"]["itemizedCategories"][number],
  draft: Pick<Draft, "selectedValues" | "wagers">,
) {
  return evaluateItemizedCategoryFormula({
    category,
    values: buildLostCitiesCategoryValues(draft),
  }).normalizedScore;
}

function buildDrafts(input: {
  categories: PlayGameV2ScreenProps["config"]["itemizedCategories"];
  entries: PlayGameV2ScreenProps["snapshot"]["game"]["itemizedScoreEntries"];
  gameRoundId: string | null;
  players: PlayGameV2ScreenProps["snapshot"]["game"]["players"];
  roundScoped: boolean;
}) {
  const drafts = new Map<string, Draft>();
  const categoryMap = new Map(input.categories.map((category) => [category.id, category]));

  for (const player of input.players) {
    for (const category of input.categories) {
      drafts.set(draftKey(player.userId, category.id), emptyDraft());
    }
  }

  for (const entry of input.entries) {
    if (
      (input.roundScoped && entry.gameRoundId !== input.gameRoundId) ||
      (!input.roundScoped && entry.gameRoundId !== null)
    ) continue;

    const category = categoryMap.get(entry.categoryId);
    if (!category) continue;
    const persisted = parseLostCitiesPersistedEntry(entry.valuesJson);
    const subtotal = evaluateItemizedCategoryFormula({
      category,
      values: persisted.rawValues,
    }).normalizedScore;
    drafts.set(draftKey(entry.userId, entry.categoryId), {
      selectedValues: persisted.selectedValues,
      wagers: persisted.wagers,
      subtotal,
    });
  }

  return drafts;
}

function ExpeditionIcon({ emblem }: { emblem: string }) {
  const className = "size-8";
  switch (emblem) {
    case "sun": return <Sun className={className} />;
    case "wave": return <Waves className={className} />;
    case "peak": return <Mountain className={className} />;
    case "leaf": return <Leaf className={className} />;
    case "flame": return <Flame className={className} />;
    default: return <Sparkles className={className} />;
  }
}

function expeditionStyles(color: string) {
  const profileStyles = getProfileColorSurfaceStyles(color);
  return {
    ...profileStyles,
    backgroundColor: color,
    color: "var(--profile-surface-text)",
  };
}

export function LostCitiesPlayGameV2Screen({
  actions,
  config,
  pendingActionKeys,
  snapshot,
  surface,
  viewModel,
}: PlayGameV2ScreenProps) {
  const expeditions = useMemo(
    () => getLostCitiesOrderedCategories(config.itemizedCategories),
    [config.itemizedCategories],
  );
  const categories = useMemo(
    () => expeditions.map((entry) => entry.category),
    [expeditions],
  );
  const isRoundBased = config.settings.roundConfig.enabled;
  const activeRound = snapshot.game.rounds.find(
    (round) => round.roundNumber === viewModel.activeRoundNumber,
  );
  const activeRoundId = activeRound?.id ?? null;
  const initialDrafts = useMemo(
    () => buildDrafts({
      categories,
      entries: snapshot.game.itemizedScoreEntries,
      gameRoundId: activeRoundId,
      players: snapshot.game.players,
      roundScoped: isRoundBased,
    }),
    [activeRoundId, categories, isRoundBased, snapshot.game.itemizedScoreEntries, snapshot.game.players],
  );
  const [overrides, setOverrides] = useState(() => new Map<string, Draft>());
  const drafts = useMemo(
    () => new Map([...initialDrafts, ...overrides]),
    [initialDrafts, overrides],
  );
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [isManagePlayersOpen, setIsManagePlayersOpen] = useState(false);
  const [isRoundHistoryOpen, setIsRoundHistoryOpen] = useState(false);
  const [isShareDrawerOpen, setIsShareDrawerOpen] = useState(false);

  const requiredPlayers = config.settings.playerConfig.minPlayers ?? 2;
  const hasRequiredPlayers = snapshot.game.players.length >= requiredPlayers;
  const canEdit = snapshot.canManageLiveGame && !viewModel.isCompleted &&
    !viewModel.isPaused && hasRequiredPlayers && pendingActionKeys.size === 0;
  const targetRounds = config.settings.roundConfig.targetRounds;
  const isFinalRound = isRoundBased && targetRounds !== null &&
    viewModel.activeRoundNumber >= targetRounds;

  const persistedScopeTotals = useMemo(() => {
    const totals = new Map(snapshot.game.players.map((player) => [player.userId, 0]));
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    for (const entry of snapshot.game.itemizedScoreEntries) {
      if (
        (isRoundBased && entry.gameRoundId !== activeRoundId) ||
        (!isRoundBased && entry.gameRoundId !== null)
      ) continue;
      const category = categoryMap.get(entry.categoryId);
      if (!category) continue;
      const persisted = parseLostCitiesPersistedEntry(entry.valuesJson);
      const score = evaluateItemizedCategoryFormula({
        category,
        values: persisted.rawValues,
      }).normalizedScore;
      totals.set(entry.userId, (totals.get(entry.userId) ?? 0) + score);
    }
    return totals;
  }, [activeRoundId, categories, isRoundBased, snapshot.game.itemizedScoreEntries, snapshot.game.players]);

  const playerTotals = useMemo(() => new Map(
    snapshot.game.players.map((player) => {
      const scopeTotal = categories.reduce(
        (sum, category) => sum + (drafts.get(draftKey(player.userId, category.id))?.subtotal ?? 0),
        0,
      );
      return [
        player.userId,
        isRoundBased
          ? (player.score ?? 0) - (persistedScopeTotals.get(player.userId) ?? 0) + scopeTotal
          : scopeTotal,
      ];
    }),
  ), [categories, drafts, isRoundBased, persistedScopeTotals, snapshot.game.players]);

  const editorIndex = editor
    ? expeditions.findIndex((entry) => entry.category.id === editor.categoryId)
    : -1;
  const editorExpedition = editorIndex >= 0 ? expeditions[editorIndex] ?? null : null;
  const editorDraft = editor && editorExpedition
    ? drafts.get(draftKey(editor.userId, editor.categoryId)) ?? emptyDraft()
    : null;
  const wagerInputLabel =
    editorExpedition?.category.inputs.find((input) => input.key === "wagers")
      ?.label ?? "Wagers";
  const cardsInputLabel =
    editorExpedition?.category.inputs.find((input) => input.key === "card_sum")
      ?.label ?? "Cards";
  const unavailableCards = useMemo(() => {
    const values = new Set<number>();
    if (!editor) return values;
    for (const player of snapshot.game.players) {
      if (player.userId === editor.userId) continue;
      const draft = drafts.get(draftKey(player.userId, editor.categoryId));
      for (const value of draft?.selectedValues ?? []) values.add(value);
    }
    return values;
  }, [drafts, editor, snapshot.game.players]);

  const resolvedSurface = useMemo<PlayGameV2SurfaceConfig>(() => surface ?? {
    adminDrawer: {
      completedAt: snapshot.game.completedAt,
      createdAt: snapshot.game.createdAt,
      creatorName: getPlayGameV2DisplayName(snapshot.game.creator),
      endingSummary: formatPlayGameV2EndingSummary(config),
      gameId: snapshot.game.id,
      isCompleted: viewModel.isCompleted,
      scoringSummary: formatPlayGameV2ScoringSummary(config),
    },
    bottomBar: {
      variant: viewModel.isCompleted ? "completed" : snapshot.canManageLiveGame ? "tally" : "viewer",
    },
    header: { title: "Lost Cities" },
  }, [config, snapshot, surface, viewModel]);

  function updateDraft(updater: (current: Draft) => Pick<Draft, "selectedValues" | "wagers">) {
    if (!editor || !editorExpedition || !canEdit) return;
    const key = draftKey(editor.userId, editor.categoryId);
    const current = drafts.get(key) ?? emptyDraft();
    const nextValues = updater(current);
    setOverrides((existing) => new Map(existing).set(key, {
      ...nextValues,
      selectedValues: [...nextValues.selectedValues].sort((left, right) => left - right),
      subtotal: scoreDraft(editorExpedition.category, nextValues),
    }));
  }

  function buildPlayerEntries(userId: string) {
    return categories.map((category) => {
      const draft = drafts.get(draftKey(userId, category.id)) ?? emptyDraft();
      return {
        userId,
        categoryId: category.id,
        values: buildLostCitiesCategoryValues(draft),
      };
    });
  }

  function closeEditor(save: boolean) {
    if (save && editor && canEdit) {
      const input = { userId: editor.userId, entries: buildPlayerEntries(editor.userId) };
      if (isRoundBased) actions.saveRoundItemizedScore(input);
      else actions.saveEndGameItemizedScore(input);
    }
    setEditor(null);
  }

  function advanceScoring() {
    if (isRoundBased) actions.commitRound({ completeGame: isFinalRound });
    else actions.completeGame({
      itemizedScoreEntries: snapshot.game.players.flatMap((player) => buildPlayerEntries(player.userId)),
    });
  }

  return (
    <>
      <div data-testid="lost-cities-play-game">
        <PlayGameV2Shell
          adminDrawer={snapshot.canManageLiveGame && resolvedSurface.adminDrawer ? {
            ...resolvedSurface.adminDrawer,
            actions: {
              canEndGame: !viewModel.isCompleted,
              canManagePlayers: true,
              canReopenGame: viewModel.isCompleted && snapshot.isCreator,
              canShare: true,
              canUpdateSettings: snapshot.isCreator,
              disableEndGame: !hasRequiredPlayers || pendingActionKeys.size > 0,
              disableManagePlayers: viewModel.isCompleted,
              endGameLabel: isRoundBased ? (isFinalRound ? "Finish game" : "Next round") : "End game",
              onEndGame: advanceScoring,
              onOpenManagePlayers: () => setIsManagePlayersOpen(true),
              onOpenShare: () => setIsShareDrawerOpen(true),
              onReopenGame: actions.reopenGame,
            },
          } : undefined}
          body={
            <div className="space-y-4" data-testid="lost-cities-player-list">
                {snapshot.game.players.map((player) => (
                  <section
                    key={player.userId}
                    className="overflow-hidden rounded-xl border shadow-sm"
                    style={{
                      borderColor: `color-mix(in srgb, ${player.user.color} 28%, var(--border))`,
                      background: `linear-gradient(180deg, color-mix(in srgb, ${player.user.color} 9%, var(--background)), var(--background))`,
                    }}
                  >
                    <div className="flex items-center gap-3 px-3 py-3">
                      <ProfilePicture size="md" user={player.user} />
                      <p className="min-w-0 flex-1 truncate text-xl font-black">
                        {getPlayGameV2DisplayName(player.user)}
                      </p>
                      <div className="min-w-20 rounded-xl border bg-background/75 px-3 py-3 text-center">
                        <p className="text-3xl font-black" data-testid={`lost-cities-player-total-${player.userId}`}>
                          {playerTotals.get(player.userId) ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className={`grid grid-cols-3 gap-2 px-3 pb-3 ${expeditions.length === 6 ? "sm:grid-cols-6" : "sm:grid-cols-5"}`}>
                      {expeditions.map(({ category, expedition }) => {
                        const draft = drafts.get(draftKey(player.userId, category.id)) ?? emptyDraft();
                        return (
                          <button
                            key={`${player.userId}:${category.id}`}
                            className="relative flex h-28 min-w-0 flex-col items-center justify-between overflow-hidden rounded-xl p-2 text-center shadow-sm transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            data-testid={`lost-cities-expedition-${player.userId}-${expedition.categoryId}`}
                            onClick={() => setEditor({ userId: player.userId, categoryId: category.id })}
                            style={expeditionStyles(expedition.color)}
                            type="button"
                          >
                            {draft.wagers > 0 ? (
                              <span className="absolute right-2 top-2 rounded-full border bg-background/35 px-1.5 py-0.5 text-[10px] font-black">{draft.wagers}</span>
                            ) : null}
                            <ExpeditionIcon emblem={expedition.emblem} />
                            <span className="line-clamp-2 text-[10px] font-black uppercase tracking-wide">{category.name}</span>
                            <span className="text-2xl font-black leading-none">{draft.subtotal}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
                {!hasRequiredPlayers && !viewModel.isCompleted ? (
                  <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                    Add another player to begin scoring.
                  </div>
                ) : null}
            </div>
          }
          config={config}
          footer={
            <PlayGameV2BottomBar
              leadingAction={isRoundBased
                ? {
                    disabled: viewModel.isPaused,
                    icon: ListChecks,
                    label: "Scores",
                    onClick: () => setIsRoundHistoryOpen(true),
                  }
                : viewModel.isCompleted
                  ? { icon: DoorOpen, href: "/dashboard", label: "Return" }
                  : snapshot.canManageLiveGame
                    ? viewModel.isPaused
                      ? { disabled: pendingActionKeys.size > 0, icon: Play, label: "Resume", onClick: actions.resumeGame }
                      : { disabled: pendingActionKeys.size > 0, icon: Pause, label: "Pause", onClick: actions.pauseGame }
                    : undefined}
              secondaryAction={isRoundBased
                ? viewModel.isCompleted
                  ? { icon: DoorOpen, href: "/dashboard", label: "Return" }
                  : snapshot.canManageLiveGame
                    ? viewModel.isPaused
                      ? { disabled: pendingActionKeys.size > 0, icon: Play, label: "Resume", onClick: actions.resumeGame }
                      : { disabled: pendingActionKeys.size > 0, icon: Pause, label: "Pause", onClick: actions.pauseGame }
                    : undefined
                : undefined}
              primaryAction={snapshot.canManageLiveGame ? {
                disabled: viewModel.isCompleted || pendingActionKeys.size > 0 || !hasRequiredPlayers,
                icon: isRoundBased && !isFinalRound ? FastForward : Trophy,
                label: viewModel.isCompleted
                  ? "Finished"
                  : isRoundBased
                    ? isFinalRound ? "Finish" : "Round"
                    : "Score",
                onClick: advanceScoring,
              } : undefined}
              variant={isRoundBased ? "standard" : (resolvedSurface.bottomBar?.variant ?? "tally")}
            />
          }
          game={snapshot.game}
          header={{ ...resolvedSurface.header, hideRulesSummary: true, title: "Lost Cities" }}
        />
      </div>

      <Drawer open={editor !== null} onOpenChange={(open) => { if (!open) closeEditor(true); }}>
        {editor && editorExpedition && editorDraft ? (
          <DrawerContent className="max-h-[92vh] gap-0 overflow-hidden" style={expeditionStyles(editorExpedition.expedition.color)}>
            <DrawerHeader className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between gap-3">
                <Button aria-label="Previous expedition" disabled={editorIndex <= 0} onClick={() => setEditor({ ...editor, categoryId: expeditions[editorIndex - 1]!.category.id })} size="icon-lg" type="button" variant="outline"><ChevronLeft /></Button>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
                  <ExpeditionIcon emblem={editorExpedition.expedition.emblem} />
                  <div className="min-w-0">
                    <DrawerTitle className="truncate text-2xl font-black">{getPlayGameV2DisplayName(snapshot.game.players.find((player) => player.userId === editor.userId)!.user)}</DrawerTitle>
                    <DrawerDescription className="truncate text-current opacity-75">{editorExpedition.category.name}</DrawerDescription>
                  </div>
                </div>
                <Button aria-label="Next expedition" disabled={editorIndex >= expeditions.length - 1} onClick={() => setEditor({ ...editor, categoryId: expeditions[editorIndex + 1]!.category.id })} size="icon-lg" type="button" variant="outline"><ChevronRight /></Button>
              </div>
            </DrawerHeader>
            <div className="min-h-0 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              <section>
                <p className="mb-2 text-sm font-black uppercase tracking-wider">{wagerInputLabel}</p>
                <div className="grid grid-cols-4 gap-2">
                  {WAGER_VALUES.map((value) => (
                    <Button key={value} data-testid={`lost-cities-wager-${value}`} disabled={!canEdit} onClick={() => updateDraft((draft) => ({ ...draft, wagers: value }))} type="button" variant={editorDraft.wagers === value ? "default" : "outline"}>{value}</Button>
                  ))}
                </div>
              </section>
              <section className="mt-5">
                <p className="mb-2 text-sm font-black uppercase tracking-wider">{cardsInputLabel}</p>
                <div className="grid grid-cols-3 gap-2">
                  {CARD_VALUES.map((value) => {
                    const selected = editorDraft.selectedValues.includes(value);
                    return (
                      <Button
                        key={value}
                        data-testid={`lost-cities-card-${value}`}
                        disabled={!canEdit || (unavailableCards.has(value) && !selected)}
                        onClick={() => updateDraft((draft) => ({
                          ...draft,
                          selectedValues: selected
                            ? draft.selectedValues.filter((entry) => entry !== value)
                            : [...draft.selectedValues, value],
                        }))}
                        type="button"
                        variant={selected ? "default" : "outline"}
                      >{value}</Button>
                    );
                  })}
                </div>
              </section>
              <div className="mt-5 rounded-xl border bg-background/25 p-4">
                <p className="text-4xl font-black" data-testid="lost-cities-editor-total">{editorDraft.subtotal}</p>
                {editorExpedition.category.helpText ? (
                  <p className="mt-2 text-sm opacity-75">{editorExpedition.category.helpText}</p>
                ) : null}
              </div>
              <Button className="mt-4 w-full" onClick={() => closeEditor(true)} type="button">{canEdit ? "Done" : "Close"}</Button>
            </div>
          </DrawerContent>
        ) : null}
      </Drawer>

      <Drawer onOpenChange={setIsShareDrawerOpen} open={isShareDrawerOpen}>
        <DrawerContent className="gap-4 pb-28">
          <PlayGameV2ShareDrawerBody game={snapshot.game} gameSharePath={snapshot.gameSharePath} isCompleted={viewModel.isCompleted} onToggleInviteUsers={(enabled) => actions.setInviteUsersEnabled({ enabled })} />
        </DrawerContent>
      </Drawer>
      <Drawer onOpenChange={setIsRoundHistoryOpen} open={isRoundHistoryOpen}>
        <DrawerContent className="max-h-[88vh] gap-4 pb-28">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-black">Round scores</DrawerTitle>
            <DrawerDescription>
              Scores recorded for each Lost Cities round.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 overflow-y-auto px-4">
            {[...snapshot.game.rounds]
              .sort((left, right) => right.roundNumber - left.roundNumber)
              .map((round) => (
                <section className="rounded-xl border bg-card p-4" key={round.id}>
                  <p className="font-black">Round {round.roundNumber}</p>
                  <div className="mt-3 space-y-2">
                    {snapshot.game.players.map((player) => (
                      <div className="flex items-center justify-between gap-3 text-sm" key={player.userId}>
                        <span>{getPlayGameV2DisplayName(player.user)}</span>
                        <span className="font-black">
                          {round.scores.find((score) => score.userId === player.userId)?.scoreDelta ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            {snapshot.game.rounds.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                No round scores recorded yet.
              </div>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
      <Dialog onOpenChange={setIsManagePlayersOpen} open={isManagePlayersOpen}>
        <PlayGameV2ManagePlayersDialogBody actions={actions} onClose={() => setIsManagePlayersOpen(false)} snapshot={snapshot} viewModel={viewModel} />
      </Dialog>
    </>
  );
}
