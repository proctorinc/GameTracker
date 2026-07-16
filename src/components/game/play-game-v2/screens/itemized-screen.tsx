"use client";

import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  buildDefaultItemizedValues,
  evaluateItemizedCategoryFormula,
  ITEMIZED_SCORE_INCLUDED_METADATA_KEY,
  parsePersistedItemizedValues,
  type ItemizedScoreEntryValues,
} from "@/lib/game/itemized-scoring";
import type { GameSettingsItemizedCategory } from "@/lib/game/v2";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Delete,
  DoorOpen,
  Minus,
  Pause,
  Play,
  Plus,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { PlayGameV2ScreenProps, PlayGameV2SurfaceConfig } from "../types";
import {
  PlayGameV2BottomBar,
  PlayGameV2ManagePlayersDialogBody,
  PlayGameV2OutcomeSummaryDialog,
  PlayGameV2ShareDrawerBody,
  PlayGameV2Shell,
  formatPlayGameV2EndingSummary,
  formatPlayGameV2ScoringSummary,
  getPlayGameV2DisplayName,
} from "../shared";

type ItemizedDraft = {
  included: boolean;
  values: ItemizedScoreEntryValues;
};

type EditorState = {
  categoryId: string;
  userId: string;
};

function buildDraftKey(userId: string, categoryId: string) {
  return `${userId}:${categoryId}`;
}

function getOrderedCategories(categories: GameSettingsItemizedCategory[]) {
  return [...categories].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );
}

function createDefaultDraft(category: GameSettingsItemizedCategory): ItemizedDraft {
  return {
    included: !category.optional,
    values: buildDefaultItemizedValues(category),
  };
}

function buildInitialDrafts(input: {
  categories: GameSettingsItemizedCategory[];
  entries: PlayGameV2ScreenProps["snapshot"]["game"]["itemizedScoreEntries"];
  gameRoundId: string | null;
  players: PlayGameV2ScreenProps["snapshot"]["game"]["players"];
  roundScoped: boolean;
}) {
  const drafts = new Map<string, ItemizedDraft>();
  const categoryMap = new Map(input.categories.map((category) => [category.id, category]));

  for (const player of input.players) {
    for (const category of input.categories) {
      drafts.set(buildDraftKey(player.userId, category.id), createDefaultDraft(category));
    }
  }

  for (const entry of input.entries) {
    if (
      (input.roundScoped && entry.gameRoundId !== input.gameRoundId) ||
      (!input.roundScoped && entry.gameRoundId !== null)
    ) {
      continue;
    }

    const category = categoryMap.get(entry.categoryId);
    if (!category) continue;

    const persisted = parsePersistedItemizedValues(entry.valuesJson);
    drafts.set(buildDraftKey(entry.userId, entry.categoryId), {
      included: category.optional
        ? persisted[ITEMIZED_SCORE_INCLUDED_METADATA_KEY] !== 0
        : true,
      values: Object.fromEntries(
        category.inputs.map((categoryInput) => [
          categoryInput.key,
          persisted[categoryInput.key] ?? categoryInput.defaultValue,
        ]),
      ),
    });
  }

  return drafts;
}

function getDraftScore(category: GameSettingsItemizedCategory, draft: ItemizedDraft) {
  if (category.optional && !draft.included) return 0;
  return evaluateItemizedCategoryFormula({ category, values: draft.values }).normalizedScore;
}

function appendDigit(value: number, digit: number) {
  const negative = value < 0;
  const next = Number(`${Math.abs(value)}${digit}`);
  return negative ? -next : next;
}

export function ItemizedPlayGameV2Screen({
  actions,
  config,
  pendingActionKeys,
  snapshot,
  surface,
  viewModel,
}: PlayGameV2ScreenProps) {
  const categories = useMemo(
    () => getOrderedCategories(config.itemizedCategories),
    [config.itemizedCategories],
  );
  const isRoundBased = config.settings.roundConfig.enabled;
  const activeRound = snapshot.game.rounds.find(
    (round) => round.roundNumber === viewModel.activeRoundNumber,
  );
  const activeRoundId = activeRound?.id ?? null;
  const initialDrafts = useMemo(
    () => buildInitialDrafts({
      categories,
      entries: snapshot.game.itemizedScoreEntries,
      gameRoundId: activeRoundId,
      players: snapshot.game.players,
      roundScoped: isRoundBased,
    }),
    [
      activeRoundId,
      categories,
      isRoundBased,
      snapshot.game.itemizedScoreEntries,
      snapshot.game.players,
    ],
  );
  const [draftOverrides, setDraftOverrides] = useState(
    () => new Map<string, ItemizedDraft>(),
  );
  const drafts = useMemo(
    () => new Map([...initialDrafts, ...draftOverrides]),
    [draftOverrides, initialDrafts],
  );
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [isManagePlayersOpen, setIsManagePlayersOpen] = useState(false);
  const [isOutcomeSummaryOpen, setIsOutcomeSummaryOpen] = useState(false);
  const [isShareDrawerOpen, setIsShareDrawerOpen] = useState(false);

  const requiredPlayers = config.settings.playerConfig.minPlayers ?? 1;
  const hasRequiredPlayers = snapshot.game.players.length >= requiredPlayers;
  const canEditPlayer = (userId: string) =>
    (snapshot.canManageLiveGame ||
      (snapshot.canEditOwnScore && snapshot.currentUserId === userId)) &&
    !viewModel.isCompleted &&
    !viewModel.isPaused &&
    hasRequiredPlayers &&
    pendingActionKeys.size === 0;
  const targetRounds = config.settings.roundConfig.targetRounds;
  const isFinalRound =
    isRoundBased && targetRounds !== null && viewModel.activeRoundNumber >= targetRounds;

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
      const values = parsePersistedItemizedValues(entry.valuesJson);
      const included =
        !category.optional ||
        values[ITEMIZED_SCORE_INCLUDED_METADATA_KEY] !== 0;
      const score = included
        ? evaluateItemizedCategoryFormula({ category, values }).normalizedScore
        : 0;
      totals.set(entry.userId, (totals.get(entry.userId) ?? 0) + score);
    }
    return totals;
  }, [activeRoundId, categories, isRoundBased, snapshot.game.itemizedScoreEntries, snapshot.game.players]);

  const scopeTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const player of snapshot.game.players) {
      totals.set(
        player.userId,
        categories.reduce((sum, category) => {
          const draft = drafts.get(buildDraftKey(player.userId, category.id)) ?? createDefaultDraft(category);
          return sum + getDraftScore(category, draft);
        }, 0),
      );
    }
    return totals;
  }, [categories, drafts, snapshot.game.players]);

  const playerTotals = useMemo(() => {
    return new Map(
      snapshot.game.players.map((player) => {
        const scopeTotal = scopeTotals.get(player.userId) ?? 0;
        return [
          player.userId,
          isRoundBased
            ? (player.score ?? 0) - (persistedScopeTotals.get(player.userId) ?? 0) + scopeTotal
            : scopeTotal,
        ];
      }),
    );
  }, [isRoundBased, persistedScopeTotals, scopeTotals, snapshot.game.players]);

  const winningTotal = useMemo(() => {
    const totals = [...playerTotals.values()];
    if (totals.length === 0) return null;
    return config.settings.winMetric === "lowest_score"
      ? Math.min(...totals)
      : Math.max(...totals);
  }, [config.settings.winMetric, playerTotals]);

  const outcomeSummaryRows = useMemo(
    () =>
      snapshot.game.players.map((player) => ({
        breakdown: categories.map((category) => ({
          label: category.name,
          value: getDraftScore(
            category,
            drafts.get(buildDraftKey(player.userId, category.id)) ??
              createDefaultDraft(category),
          ),
        })),
        isWinner:
          winningTotal !== null &&
          (playerTotals.get(player.userId) ?? 0) === winningTotal,
        name: getPlayGameV2DisplayName(player.user),
        scopeScore: scopeTotals.get(player.userId) ?? 0,
        totalScore: playerTotals.get(player.userId) ?? 0,
        userId: player.userId,
      })),
    [categories, drafts, playerTotals, scopeTotals, snapshot.game.players, winningTotal],
  );

  const editorCategory = editor
    ? categories.find((category) => category.id === editor.categoryId) ?? null
    : null;
  const canEdit = editor ? canEditPlayer(editor.userId) : false;
  const editorDraft = editor && editorCategory
    ? drafts.get(buildDraftKey(editor.userId, editor.categoryId)) ?? createDefaultDraft(editorCategory)
    : null;
  const editorCategoryIndex = editorCategory
    ? categories.findIndex((category) => category.id === editorCategory.id)
    : -1;

  const resolvedSurface = useMemo<PlayGameV2SurfaceConfig>(
    () =>
      surface ?? {
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
          variant: viewModel.isCompleted
            ? "completed"
            : snapshot.canManageLiveGame
              ? "tally"
              : "viewer",
        },
        header: {},
      },
    [config, snapshot, surface, viewModel],
  );

  function updateEditorDraft(updater: (draft: ItemizedDraft) => ItemizedDraft) {
    if (!editor || !editorCategory || !canEditPlayer(editor.userId)) return;
    setDraftOverrides((current) => {
      const next = new Map(current);
      const key = buildDraftKey(editor.userId, editor.categoryId);
      next.set(
        key,
        updater(drafts.get(key) ?? createDefaultDraft(editorCategory)),
      );
      return next;
    });
  }

  function buildPlayerEntries(userId: string) {
    return categories.map((category) => {
      const draft = drafts.get(buildDraftKey(userId, category.id)) ?? createDefaultDraft(category);
      return {
        userId,
        categoryId: category.id,
        values: {
          ...draft.values,
          ...(category.optional
            ? { [ITEMIZED_SCORE_INCLUDED_METADATA_KEY]: draft.included ? 1 : 0 }
            : {}),
        },
      };
    });
  }

  function closeEditor(save: boolean) {
    if (save && editor && canEditPlayer(editor.userId)) {
      const input = { entries: buildPlayerEntries(editor.userId), userId: editor.userId };
      if (isRoundBased) actions.saveRoundItemizedScore(input);
      else actions.saveEndGameItemizedScore(input);
    }
    setEditor(null);
  }

  function moveEditor(offset: number) {
    if (!editor || editorCategoryIndex < 0) return;
    const category = categories[editorCategoryIndex + offset];
    if (category) setEditor({ ...editor, categoryId: category.id });
  }

  function buildCompletionEntries() {
    return snapshot.game.players.flatMap((player) => buildPlayerEntries(player.userId));
  }

  function confirmScoring() {
    if (isRoundBased) {
      actions.commitRound({ completeGame: isFinalRound });
    } else {
      actions.completeGame({ itemizedScoreEntries: buildCompletionEntries() });
    }
    setIsOutcomeSummaryOpen(false);
  }

  return (
    <>
      <PlayGameV2Shell
        adminDrawer={
          snapshot.canManageLiveGame && resolvedSurface.adminDrawer
            ? {
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
                  onEndGame: () => setIsOutcomeSummaryOpen(true),
                  onOpenManagePlayers: () => setIsManagePlayersOpen(true),
                  onOpenShare: () => setIsShareDrawerOpen(true),
                  onReopenGame: actions.reopenGame,
                },
              }
            : undefined
        }
        body={
          <div className="space-y-4" data-testid="itemized-player-list">
              {snapshot.game.players.map((player) => {
                return (
                  <section
                    key={player.userId}
                    className="overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-sm"
                    style={{
                      borderColor: `color-mix(in srgb, ${player.user.color} 24%, var(--border))`,
                      background: `linear-gradient(180deg, color-mix(in srgb, ${player.user.color} 8%, var(--card)) 0%, var(--card) 100%)`,
                    }}
                  >
                    <div className="flex items-center gap-3 px-3 py-3">
                      <ProfilePicture size="md" user={player.user} />
                      <p className="min-w-0 flex-1 truncate text-xl font-black">
                        {getPlayGameV2DisplayName(player.user)}
                      </p>
                      <div className="min-w-20 rounded-[1.4rem] border bg-background/75 px-3 py-3 text-center shadow-sm">
                        <p className="text-3xl font-black" data-testid={`itemized-player-total-${player.userId}`}>
                          {playerTotals.get(player.userId) ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-3">
                      {categories.map((category) => {
                        const draft = drafts.get(buildDraftKey(player.userId, category.id)) ?? createDefaultDraft(category);
                        const score = getDraftScore(category, draft);
                        return (
                          <button
                            key={`${player.userId}:${category.id}`}
                            className="flex aspect-square min-w-0 flex-col justify-between rounded-[1.5rem] border bg-background/75 p-3 text-left shadow-sm transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                            data-testid={`itemized-category-${player.userId}-${category.id}`}
                            onClick={() => setEditor({ userId: player.userId, categoryId: category.id })}
                            type="button"
                          >
                            <div className="min-w-0">
                              <p className="line-clamp-3 text-sm font-black leading-tight">{category.name}</p>
                              {category.optional ? (
                                <Badge className="mt-2" variant="outline">
                                  {draft.included ? "Included" : "Skipped"}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-3xl font-black leading-none" data-testid={`itemized-category-total-${player.userId}-${category.id}`}>
                              {score}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
              {!hasRequiredPlayers && !viewModel.isCompleted ? (
                <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  Add {requiredPlayers - snapshot.game.players.length} more player{requiredPlayers - snapshot.game.players.length === 1 ? "" : "s"} to begin scoring.
                </div>
              ) : null}
          </div>
        }
        config={config}
        footer={
          <PlayGameV2BottomBar
            leadingAction={
              resolvedSurface.bottomBar?.variant === "tally" && snapshot.canManageLiveGame && !viewModel.isCompleted
                ? viewModel.isPaused
                  ? {
                      disabled: pendingActionKeys.size > 0,
                      icon: Play,
                      label: "Resume",
                      onClick: actions.resumeGame,
                    }
                  : {
                      disabled: pendingActionKeys.size > 0,
                      icon: Pause,
                      label: "Pause",
                      onClick: actions.pauseGame,
                    }
                : resolvedSurface.bottomBar?.variant === "completed"
                  ? { icon: DoorOpen, href: "/dashboard", label: "Return" }
                  : undefined
            }
            primaryAction={
              resolvedSurface.bottomBar?.variant === "tally" && snapshot.canManageLiveGame
                ? {
                    disabled: viewModel.isCompleted || pendingActionKeys.size > 0 || !hasRequiredPlayers,
                    icon: Trophy,
                    label: isRoundBased ? (isFinalRound ? "Finish game" : "Next round") : "Score",
                    onClick: () => setIsOutcomeSummaryOpen(true),
                  }
                : undefined
            }
            variant={resolvedSurface.bottomBar?.variant ?? "tally"}
          />
        }
        game={snapshot.game}
        header={{ ...resolvedSurface.header, hideRulesSummary: true }}
      />

      <Drawer
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) closeEditor(true);
        }}
      >
        {editor && editorCategory && editorDraft ? (
          <DrawerContent className="max-h-[92vh] gap-0 overflow-hidden rounded-t-[2rem]">
            <DrawerHeader className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between gap-3">
                <Button aria-label="Previous item" disabled={editorCategoryIndex <= 0} onClick={() => moveEditor(-1)} size="icon-lg" type="button" variant="outline">
                  <ChevronLeft className="size-5" />
                </Button>
                <div className="min-w-0 flex-1 text-center">
                  <DrawerTitle className="truncate text-2xl font-black">{editorCategory.name}</DrawerTitle>
                  <DrawerDescription className="truncate">
                    {getPlayGameV2DisplayName(snapshot.game.players.find((player) => player.userId === editor.userId)?.user ?? snapshot.game.creator)}
                  </DrawerDescription>
                </div>
                <Button aria-label="Next item" disabled={editorCategoryIndex >= categories.length - 1} onClick={() => moveEditor(1)} size="icon-lg" type="button" variant="outline">
                  <ChevronRight className="size-5" />
                </Button>
              </div>
            </DrawerHeader>
            <div className="min-h-0 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              <div className="rounded-[1.75rem] border bg-muted/30 p-4">
                <p className="text-4xl font-black" data-testid="itemized-editor-total">
                  {getDraftScore(editorCategory, editorDraft)}
                </p>
                {editorCategory.helpText ? <p className="mt-2 text-sm text-muted-foreground">{editorCategory.helpText}</p> : null}
              </div>

              {editorCategory.optional ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button disabled={!canEdit} onClick={() => updateEditorDraft((draft) => ({ ...draft, included: true }))} type="button" variant={editorDraft.included ? "default" : "outline"}>Include</Button>
                  <Button disabled={!canEdit} onClick={() => updateEditorDraft((draft) => ({ ...draft, included: false }))} type="button" variant={!editorDraft.included ? "default" : "outline"}>Skip</Button>
                </div>
              ) : null}

              {editorCategory.inputMode === "single" && editorCategory.inputs[0] ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 rounded-[1.75rem] border p-3">
                    <Button aria-label="Decrease value by 1" disabled={!canEdit} onClick={() => updateEditorDraft((draft) => ({ ...draft, values: { ...draft.values, [editorCategory.inputs[0]!.key]: (draft.values[editorCategory.inputs[0]!.key] ?? 0) - 1 } }))} size="icon-lg" type="button" variant="outline"><Minus /></Button>
                    <div className="text-center">
                      <p className="text-sm font-bold text-muted-foreground">{editorCategory.inputs[0].label}</p>
                      <p className="text-4xl font-black" data-testid="itemized-editor-value">{editorDraft.values[editorCategory.inputs[0].key] ?? 0}</p>
                    </div>
                    <Button aria-label="Increase value by 1" disabled={!canEdit} onClick={() => updateEditorDraft((draft) => ({ ...draft, values: { ...draft.values, [editorCategory.inputs[0]!.key]: (draft.values[editorCategory.inputs[0]!.key] ?? 0) + 1 } }))} size="icon-lg" type="button" variant="outline"><Plus /></Button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[1,2,3,4,5,6,7,8,9].map((digit) => (
                      <Button className="rounded-[1.5rem]" key={digit} disabled={!canEdit} onClick={() => updateEditorDraft((draft) => ({ ...draft, values: { ...draft.values, [editorCategory.inputs[0]!.key]: appendDigit(draft.values[editorCategory.inputs[0]!.key] ?? 0, digit) } }))} type="button" variant="outline">{digit}</Button>
                    ))}
                    <Button aria-label="Toggle positive or negative" className="rounded-[1.5rem]" disabled={!canEdit} onClick={() => updateEditorDraft((draft) => ({ ...draft, values: { ...draft.values, [editorCategory.inputs[0]!.key]: -(draft.values[editorCategory.inputs[0]!.key] ?? 0) } }))} type="button" variant="outline">+/-</Button>
                    <Button className="rounded-[1.5rem]" disabled={!canEdit} onClick={() => updateEditorDraft((draft) => ({ ...draft, values: { ...draft.values, [editorCategory.inputs[0]!.key]: appendDigit(draft.values[editorCategory.inputs[0]!.key] ?? 0, 0) } }))} type="button" variant="outline">0</Button>
                    <Button aria-label="Delete digit" className="rounded-[1.5rem]" disabled={!canEdit} onClick={() => updateEditorDraft((draft) => ({ ...draft, values: { ...draft.values, [editorCategory.inputs[0]!.key]: Math.trunc((draft.values[editorCategory.inputs[0]!.key] ?? 0) / 10) } }))} type="button" variant="outline"><Delete /></Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {editorCategory.inputs.map((categoryInput) => (
                    <label key={categoryInput.key} className="block rounded-xl border p-4">
                      <span className="text-sm font-bold">{categoryInput.label}</span>
                      <Input
                        className="mt-2 h-12"
                        data-testid={`itemized-input-${editorCategory.id}-${categoryInput.key}`}
                        disabled={!canEdit}
                        inputMode="numeric"
                        onChange={(event) => updateEditorDraft((draft) => ({ ...draft, values: { ...draft.values, [categoryInput.key]: Number(event.target.value || 0) } }))}
                        type="number"
                        value={editorDraft.values[categoryInput.key] ?? categoryInput.defaultValue}
                      />
                    </label>
                  ))}
                </div>
              )}

              <Button className="mt-4 w-full" onClick={() => closeEditor(true)} type="button">
                <Check className="size-4" />
                {canEdit ? "Done" : "Close"}
              </Button>
            </div>
          </DrawerContent>
        ) : null}
      </Drawer>

      <Drawer onOpenChange={setIsShareDrawerOpen} open={isShareDrawerOpen}>
        <DrawerContent className="gap-4 pb-28">
          <PlayGameV2ShareDrawerBody game={snapshot.game} gameSharePath={snapshot.gameSharePath} isCompleted={viewModel.isCompleted} onToggleInviteUsers={(enabled) => actions.setInviteUsersEnabled({ enabled })} />
        </DrawerContent>
      </Drawer>

      <Dialog onOpenChange={setIsManagePlayersOpen} open={isManagePlayersOpen}>
        <PlayGameV2ManagePlayersDialogBody actions={actions} onClose={() => setIsManagePlayersOpen(false)} snapshot={snapshot} viewModel={viewModel} />
      </Dialog>

      <PlayGameV2OutcomeSummaryDialog
        confirmLabel={
          isRoundBased ? (isFinalRound ? "Finish game" : "Start next round") : "End game"
        }
        disabled={!hasRequiredPlayers || viewModel.isPaused}
        intent={isRoundBased && !isFinalRound ? "round" : "game"}
        onConfirm={confirmScoring}
        onOpenChange={setIsOutcomeSummaryOpen}
        open={isOutcomeSummaryOpen}
        pending={
          pendingActionKeys.has(isRoundBased ? "commit-round" : "complete-game")
        }
        roundNumber={viewModel.activeRoundNumber}
        rows={outcomeSummaryRows}
      />
    </>
  );
}
