"use client";

import { createConfiguredGame } from "@/app/actions/game";
import GameSettingsFields, {
  type EditableGameSettings,
} from "@/components/game/game-settings-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardEmpty, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { GameTitleLibraryEntry } from "@/lib/db/store/game.store";
import {
  APP_GAME_SETTINGS_DEFAULTS,
  formatResolvedEndingSummary,
  normalizeGameTitleDefaults,
  resolveGameSettingsDefaults,
} from "@/lib/game/title-defaults";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ChevronDown,
  LoaderCircle,
  Plus,
  Redo2,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type DraftTitle =
  | { titleId: string; newTitle: null; label: string }
  | { titleId: null; newTitle: string; label: string };

function normalizeTitleValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function resolveEditableSettings(
  title: GameTitleLibraryEntry | null,
): EditableGameSettings {
  const defaults = title
    ? resolveGameSettingsDefaults(normalizeGameTitleDefaults(title))
    : APP_GAME_SETTINGS_DEFAULTS;

  return {
    scoringMode: defaults.scoringMode,
    endingMode: defaults.endingMode,
    targetRounds: String(defaults.targetRounds),
    scoreThreshold: String(defaults.scoreThreshold),
    scoreThresholdDirection: defaults.scoreThresholdDirection,
  };
}

export default function CreateGameSettingsStep({
  allGameTitles,
  initialSelectedTitle,
  initialNewTitle,
  suggestedGameTitles,
}: {
  allGameTitles: GameTitleLibraryEntry[];
  initialSelectedTitle: GameTitleLibraryEntry | null;
  initialNewTitle: string | null;
  suggestedGameTitles: GameTitleLibraryEntry[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTitle, setSelectedTitle] =
    useState<GameTitleLibraryEntry | null>(initialSelectedTitle);
  const [selectedNewTitle, setSelectedNewTitle] = useState(
    initialSelectedTitle ? null : initialNewTitle?.trim() || null,
  );
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);

  const isChoosingTitle = !selectedTitle && !selectedNewTitle;
  const trimmedSearchValue = searchValue.trim();
  const normalizedSearchValue = normalizeTitleValue(deferredSearchValue);
  const searchResults = useMemo(() => {
    if (!normalizedSearchValue || !isChoosingTitle) {
      return [];
    }

    return allGameTitles
      .filter((title) =>
        [title.title, title.normalizedTitle].some((value) =>
          value.toLowerCase().includes(normalizedSearchValue),
        ),
      )
      .slice(0, 8);
  }, [allGameTitles, isChoosingTitle, normalizedSearchValue]);

  const hasExactSearchMatch = useMemo(
    () =>
      searchResults.some(
        (title) => title.normalizedTitle === normalizedSearchValue,
      ),
    [normalizedSearchValue, searchResults],
  );
  const showSuggestedGrid = !normalizedSearchValue;
  const visibleTitles = normalizedSearchValue
    ? searchResults
    : suggestedGameTitles;
  const draftTitle = useMemo<DraftTitle | null>(() => {
    if (selectedTitle) {
      return {
        titleId: selectedTitle.id,
        newTitle: null,
        label: selectedTitle.title,
      };
    }

    if (selectedNewTitle) {
      return {
        titleId: null,
        newTitle: selectedNewTitle,
        label: selectedNewTitle,
      };
    }

    return null;
  }, [selectedNewTitle, selectedTitle]);
  const initialSettings = useMemo(
    () =>
      selectedTitle
        ? resolveGameSettingsDefaults(normalizeGameTitleDefaults(selectedTitle))
        : APP_GAME_SETTINGS_DEFAULTS,
    [selectedTitle],
  );
  const [settings, setSettings] = useState<EditableGameSettings>(() =>
    resolveEditableSettings(initialSelectedTitle),
  );

  const scoringSummary =
    settings.scoringMode === "lowest_wins"
      ? "Lowest score wins"
      : "Highest score wins";
  const endingSummary = formatResolvedEndingSummary({
    scoringMode: settings.scoringMode ?? initialSettings.scoringMode,
    endingMode: settings.endingMode ?? initialSettings.endingMode,
    targetRounds: Number(settings.targetRounds || initialSettings.targetRounds),
    scoreThreshold: Number(
      settings.scoreThreshold || initialSettings.scoreThreshold,
    ),
    scoreThresholdDirection:
      settings.scoreThresholdDirection ??
      initialSettings.scoreThresholdDirection,
  });

  function selectLibraryTitle(title: GameTitleLibraryEntry) {
    setSelectedTitle(title);
    setSelectedNewTitle(null);
    setSettings(resolveEditableSettings(title));
    setSearchValue("");
  }

  function selectNewTitle(title: string) {
    const normalizedTitle = title.trim().replace(/\s+/g, " ");

    if (!normalizedTitle) {
      return;
    }

    setSelectedTitle(null);
    setSelectedNewTitle(normalizedTitle);
    setSettings(resolveEditableSettings(null));
    setSearchValue("");
  }

  function resetSelection() {
    setSelectedTitle(null);
    setSelectedNewTitle(null);
    setSettings(resolveEditableSettings(null));
    setSearchValue("");
  }

  function handleCreateGame() {
    if (!draftTitle) {
      toast.error("Choose a title first");
      return;
    }

    startTransition(async () => {
      try {
        const game = await createConfiguredGame({
          gameTitleId: draftTitle.titleId,
          gameTitleName: draftTitle.newTitle,
          scoringMode: settings.scoringMode ?? initialSettings.scoringMode,
          endingMode: settings.endingMode ?? initialSettings.endingMode,
          targetRounds:
            settings.endingMode === "round_count"
              ? Number(settings.targetRounds)
              : null,
          scoreThreshold:
            settings.endingMode === "score_threshold"
              ? Number(settings.scoreThreshold)
              : null,
          scoreThresholdDirection:
            settings.endingMode === "score_threshold"
              ? settings.scoreThresholdDirection
              : null,
        });

        router.push(`/game/${game.id}/play`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not create game",
        );
      }
    });
  }

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-24">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black">Choose game</h1>
          <p className="pl-1 text-sm text-muted-foreground">
            Search for a game title or create your own
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4">
            {isChoosingTitle ? (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-12 rounded-2xl pl-12 pr-4 text-sm"
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search or create a game"
                    value={searchValue}
                  />
                </div>

                <div className="rounded-2xl border border-border bg-muted/60">
                  <div className="flex items-center justify-between px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {normalizedSearchValue ? "Matches" : "Suggested games"}
                    </p>
                  </div>

                  <Separator />

                  <div className="p-2">
                    {visibleTitles.length === 0 && !trimmedSearchValue ? (
                      <CardEmpty className="border-0 bg-transparent py-8">
                        No saved or shared titles yet. Search above to create
                        your first one.
                      </CardEmpty>
                    ) : showSuggestedGrid ? (
                      <div className="grid grid-cols-2 gap-3 md:auto-rows-[8.75rem] auto-rows-[7.75rem]">
                        {visibleTitles.map((title, index) => {
                          const isFeatured =
                            visibleTitles.length >= 4 &&
                            index === visibleTitles.length - 1;

                          return (
                            <button
                              key={title.id}
                              className={cn(
                                "relative overflow-hidden rounded-2xl p-4 text-left transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                "flex items-end",
                                isFeatured && "col-span-2",
                              )}
                              onClick={() => selectLibraryTitle(title)}
                              type="button"
                              style={{
                                backgroundColor: title.color,
                              }}
                            >
                              {title.imageUrl ? (
                                <div
                                  className="absolute inset-0 bg-cover bg-center opacity-55"
                                  style={{
                                    backgroundImage: `url("${title.imageUrl}")`,
                                  }}
                                />
                              ) : null}
                              <div className="absolute inset-0 bg-linear-to-r from-black/60 via-black/35 to-black/10 dark:from-black/70 dark:via-black/45 dark:to-black/20" />
                              <div className="relative z-10 flex w-full flex-col items-start justify-end gap-1">
                                <p
                                  className={cn(
                                    "line-clamp-2 font-black text-white",
                                    isFeatured ? "text-lg" : "text-base",
                                  )}
                                >
                                  {title.title}
                                </p>
                                <Badge className="border-white/15 bg-white/12 text-white hover:bg-white/12">
                                  {title.isOwned
                                    ? "My game"
                                    : title.accessSource === "universal"
                                      ? "Community Game"
                                      : "Shared with you"}
                                </Badge>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {visibleTitles.map((title) => (
                          <button
                            key={title.id}
                            className={cn(
                              "relative flex min-h-20 items-end overflow-hidden rounded-2xl border border-transparent p-4 text-left transition hover:scale-[1.01]",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            )}
                            onClick={() => selectLibraryTitle(title)}
                            type="button"
                            style={{
                              backgroundColor: title.color,
                            }}
                          >
                            {title.imageUrl ? (
                              <div
                                className="absolute inset-0 bg-cover bg-center opacity-55"
                                style={{
                                  backgroundImage: `url("${title.imageUrl}")`,
                                }}
                              />
                            ) : null}
                            <div className="absolute inset-0 bg-linear-to-r from-black/60 via-black/35 to-black/10 dark:from-black/70 dark:via-black/45 dark:to-black/20" />
                            <div className="relative z-10 flex w-full items-end justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-black text-white">
                                  {title.title}
                                </p>
                                <Badge className="border-white/15 bg-white/12 text-white hover:bg-white/12">
                                  {title.isOwned
                                    ? "My game"
                                    : title.accessSource === "universal"
                                      ? "Community Game"
                                      : "Shared with you"}
                                </Badge>
                              </div>
                            </div>
                          </button>
                        ))}

                        {trimmedSearchValue && !hasExactSearchMatch ? (
                          <button
                            className="flex items-center justify-between rounded-2xl border border-dashed border-border bg-background px-4 py-3 text-left transition hover:bg-muted"
                            onClick={() => selectNewTitle(trimmedSearchValue)}
                            type="button"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                Create &quot;{trimmedSearchValue}&quot;
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Start a new title with this name
                              </p>
                            </div>
                            <Plus className="size-5 text-muted-foreground" />
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : draftTitle ? (
              <button
                className={cn(
                  "relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-border px-4 py-4 text-left transition",
                  selectedTitle
                    ? "hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    : "bg-muted/60 transition-colors hover:bg-muted",
                )}
                onClick={resetSelection}
                type="button"
                style={
                  selectedTitle
                    ? {
                        backgroundColor: selectedTitle.color,
                      }
                    : undefined
                }
              >
                {selectedTitle?.imageUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-55"
                    style={{
                      backgroundImage: `url("${selectedTitle.imageUrl}")`,
                    }}
                  />
                ) : null}
                {selectedTitle ? (
                  <div className="absolute inset-0 bg-linear-to-r from-black/65 via-black/40 to-black/15 dark:from-black/75 dark:via-black/50 dark:to-black/20" />
                ) : null}
                <div className="relative z-10 min-w-0">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      selectedTitle ? "text-white" : "text-foreground",
                    )}
                  >
                    {draftTitle.label}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      selectedTitle ? "text-white/85" : "text-muted-foreground",
                    )}
                  >
                    {draftTitle.titleId ? "Selected" : "New title"} · Tap to
                    change
                  </p>
                </div>
                <Redo2
                  className={cn(
                    "relative z-10 size-4 shrink-0",
                    selectedTitle ? "text-white/85" : "text-muted-foreground",
                  )}
                />
              </button>
            ) : null}
          </CardContent>
        </Card>

        {draftTitle ? (
          <>
            <Card>
              <CardHeader className="gap-3">
                <h2 className="pl-2 text-lg font-bold">Settings</h2>
              </CardHeader>
              <CardContent>
                <details className="group rounded-2xl border border-border bg-muted/60">
                  <summary className="flex list-none cursor-pointer items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Defaults
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {scoringSummary} · {endingSummary}
                      </p>
                    </div>
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="border-t border-border px-4 py-4">
                    <GameSettingsFields
                      allowUnset={false}
                      onChange={setSettings}
                      value={settings}
                    />
                  </div>
                </details>
              </CardContent>
            </Card>

            <Button
              className="h-14 rounded-[1.4rem]"
              disabled={isPending}
              onClick={handleCreateGame}
              type="button"
            >
              {isPending ? <LoaderCircle className="animate-spin" /> : null}
              Start game
              <ArrowRight className="size-5" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
