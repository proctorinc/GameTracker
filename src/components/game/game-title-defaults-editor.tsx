"use client";

import { saveGameTitleDefaults } from "@/app/actions/game";
import GameSettingsV2Editor from "./game-settings-v2-editor";
import {
  areEditableSettingsEqual,
  buildCurrentSettings,
  buildValidatedSettings,
  createEditableSettings,
  createSectionTouchedState,
  getEndConditionSummary,
  getGameplaySummary,
  getTemplateLabel,
  getWinConditionSummary,
  type EditableGameSettingsV2,
  type SectionOpenState,
  type SectionTouchedState,
} from "./game-settings-v2";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { GameTitleBase } from "@/lib/db/store/game.store";
import {
  parseGameSettingsV2,
  getCreateGameSettingsTitleSeed,
} from "@/lib/game/v2";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

function getTitleSettings(title: GameTitleBase) {
  if (title.defaultSettingsVersion !== "v2") {
    return null;
  }

  return parseGameSettingsV2(title.defaultSettingsJson);
}

export default function GameTitleDefaultsEditor({
  title,
  layout = "default",
}: {
  title: GameTitleBase;
  layout?: "default" | "admin";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initialSettings = useMemo(() => getTitleSettings(title), [title]);
  const titleSeed = useMemo(() => getCreateGameSettingsTitleSeed(title), [title]);
  const [draft, setDraft] = useState<EditableGameSettingsV2>(() =>
    createEditableSettings(initialSettings),
  );
  const openedSections = useMemo<SectionOpenState>(
    () => ({
      gameType: true,
      gameplay: true,
      winCondition: true,
      endCondition: true,
      tieBehavior: false,
      initialScore: true,
    }),
    [],
  );
  const [sectionOpen, setSectionOpen] = useState<SectionOpenState>(() =>
    openedSections,
  );
  const [sectionTouched, setSectionTouched] = useState<SectionTouchedState>(() =>
    createSectionTouchedState(true),
  );

  const summary = useMemo(
    () =>
      [
        getTemplateLabel(draft.template),
        getGameplaySummary(draft),
        getWinConditionSummary(draft),
        draft.gameplayMode === "rounds" ? getEndConditionSummary(draft) : null,
      ]
        .filter(Boolean)
        .join(" · "),
    [draft],
  );
  const hasChanges = !areEditableSettingsEqual(
    draft,
    createEditableSettings(initialSettings),
  );
  const isAdminLayout = layout === "admin";

  function handleReset() {
    setDraft(createEditableSettings(initialSettings));
    setSectionOpen(openedSections);
    setSectionTouched(createSectionTouchedState(true));
  }

  function handleSave() {
    let settingsV2;

    try {
      settingsV2 = buildValidatedSettings(draft);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not validate defaults",
      );
      return;
    }

    startTransition(async () => {
      try {
        await saveGameTitleDefaults({
          gameTitleId: title.id,
          settingsV2,
        });
        toast.success("Title defaults updated");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save defaults",
        );
      }
    });
  }

  return (
    <Card
      className={
        isAdminLayout ? "border-border/80 bg-card/95 shadow-sm" : undefined
      }
    >
      <CardHeader className={isAdminLayout ? "gap-3 pb-4" : "gap-3"}>
        <div
          className={
            isAdminLayout
              ? "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
              : "flex items-center justify-between gap-3"
          }
        >
          <div className="space-y-1">
            <CardTitle className="text-xl font-black">Gameplay</CardTitle>
            <p className="text-sm text-muted-foreground">
              These gameplay defaults prefill the game settings flow when
              someone picks this title.
            </p>
          </div>
          <Badge variant="outline">
            {title.isUniversal ? "Admin only" : "Owner only"}
          </Badge>
        </div>
        <div
          className={
            isAdminLayout
              ? "rounded-xl border border-border/70 bg-muted/35 p-3 lg:p-4"
              : "rounded-xl border border-border/70 bg-muted/40 p-4"
          }
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            V2 defaults
          </p>
          <p className="mt-2 text-sm font-medium">{summary}</p>
        </div>
      </CardHeader>
      <CardContent
        className={isAdminLayout ? "flex flex-col gap-4" : "flex flex-col gap-6"}
      >
        <GameSettingsV2Editor
          currentSettings={buildCurrentSettings(draft)}
          defaultColor={title.color}
          density={isAdminLayout ? "compact" : "default"}
          draft={draft}
          itemizedMode="editor"
          onDraftChange={setDraft}
          onSectionOpenChange={setSectionOpen}
          onSectionTouchedChange={setSectionTouched}
          sectionOpen={sectionOpen}
          sectionTouched={sectionTouched}
          selectedColor={title.color}
          titleSeed={titleSeed}
        />
        {isAdminLayout ? (
          <Card className="border-border/70 bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-black">Player limits</CardTitle>
              <p className="text-sm text-muted-foreground">
                Optional strict roster rules for titles like head-to-head games.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Minimum players</span>
                  <Input
                    inputMode="numeric"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        minPlayers: event.target.value,
                      }))
                    }
                    placeholder="No minimum"
                    value={draft.minPlayers}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Maximum players</span>
                  <Input
                    inputMode="numeric"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        maxPlayers: event.target.value,
                      }))
                    }
                    placeholder="No maximum"
                    value={draft.maxPlayers}
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <div
          className={
            isAdminLayout
              ? "sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-border/70 bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:flex-row sm:justify-end"
              : "flex gap-3"
          }
        >
          <Button
            className={isAdminLayout ? "sm:min-w-32" : "flex-1"}
            disabled={!hasChanges || isPending}
            onClick={handleReset}
            type="button"
            variant="outline"
          >
            Reset
          </Button>
          <Button
            className={isAdminLayout ? "sm:min-w-36" : "flex-1"}
            disabled={!hasChanges || isPending}
            onClick={handleSave}
            type="button"
          >
            Save defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
