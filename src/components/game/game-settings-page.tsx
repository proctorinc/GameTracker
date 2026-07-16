"use client";

import { updateGameSettings } from "@/app/actions/game";
import GameSettingsV2Editor from "./game-settings-v2-editor";
import GameTitleImage from "./game-title-image";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { GameForPlayPage } from "@/lib/db/store/game.store";
import {
  getCreateGameSettingsTitleSeed,
  parseGameSettingsV2,
  projectV2SettingsToLegacy,
} from "@/lib/game/v2";
import {
  hasCustomPlayGameV2Screen,
  supportsCustomPlayGameV2Screen,
} from "@/lib/game/custom-play-screen";
import { CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

function hasRecordedGameActivity(game: GameForPlayPage) {
  return (
    game.completedRounds > 0 ||
    game.players.some((player) => player.score !== 0) ||
    game.rounds.some((round) => round.scores.length > 0)
  );
}

export default function GameSettingsPage({ game }: { game: GameForPlayPage }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const parsedSettings = useMemo(
    () =>
      game.version === "v2" ? parseGameSettingsV2(game.settingsJson) : null,
    [game.settingsJson, game.version],
  );
  const titleSeed = useMemo(() => getCreateGameSettingsTitleSeed(null), []);
  const initialDraft = useMemo(
    () => createEditableSettings(parsedSettings ?? titleSeed.settings),
    [parsedSettings, titleSeed.settings],
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
  const [draft, setDraft] = useState<EditableGameSettingsV2>(initialDraft);
  const [sectionOpen, setSectionOpen] = useState<SectionOpenState>(
    () => openedSections,
  );
  const [sectionTouched, setSectionTouched] = useState<SectionTouchedState>(
    () => createSectionTouchedState(true),
  );

  const gameHasStarted = hasRecordedGameActivity(game);
  const isLocked = Boolean(game.completedAt) || gameHasStarted;
  const hasChanges = !areEditableSettingsEqual(draft, initialDraft);
  const currentSettings = useMemo(() => buildCurrentSettings(draft), [draft]);
  const hasCustomPlayScreen = hasCustomPlayGameV2Screen(game.gameTitle);
  const customPlayScreenAvailable =
    hasCustomPlayScreen &&
    supportsCustomPlayGameV2Screen({
      gameSpecificSettingsJson: game.gameSpecificSettingsJson,
      settings: currentSettings,
      title: game.gameTitle,
    });
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
  const disabledReason = game.completedAt
    ? "Completed games can’t be changed."
    : gameHasStarted
      ? "Settings can’t be changed after scorekeeping has started."
      : null;

  function handleReset() {
    setDraft(initialDraft);
    setSectionOpen(openedSections);
    setSectionTouched(createSectionTouchedState(true));
  }

  function handleSave() {
    let settingsV2;

    try {
      settingsV2 = buildValidatedSettings(draft);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not validate settings",
      );
      return;
    }

    const legacySettings = projectV2SettingsToLegacy(settingsV2);

    startTransition(async () => {
      try {
        await updateGameSettings({
          gameId: game.id,
          scoringMode: legacySettings.scoringMode,
          endingMode: legacySettings.endingMode,
          trackRounds: legacySettings.trackRounds,
          targetRounds: legacySettings.targetRounds,
          scoreThreshold: legacySettings.scoreThreshold,
          scoreThresholdDirection: legacySettings.scoreThresholdDirection,
          version: "v2",
          settingsV2,
        });
        toast.success("Game settings updated");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not update settings",
        );
      }
    });
  }

  if (!parsedSettings) {
    return (
      <div className="min-h-screen px-4 pb-32">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <GameTitleImage
            className="p-6 text-white shadow-xl"
            color={game.gameTitle?.color}
            imageUrl={game.gameTitle?.imageUrl}
            size="lg"
            verticalFocus={game.gameTitle?.imageVerticalFocus}
            variant="hero"
          >
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tight">
                {game.gameTitle?.title ?? "Untitled game"}
              </h1>
              <p className="text-sm text-white/80">
                This page now uses the V2 settings editor.
              </p>
            </div>
          </GameTitleImage>
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              This game does not have V2 settings data yet, so there is nothing
              to edit with the unified settings editor.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-32">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <GameTitleImage
          className="p-6 text-white shadow-xl"
          color={game.gameTitle?.color}
          imageUrl={game.gameTitle?.imageUrl}
          size="lg"
          verticalFocus={game.gameTitle?.imageVerticalFocus}
          variant="hero"
        >
          <div className="flex flex-col gap-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tight">
                  {game.gameTitle?.title ?? "Untitled game"}
                </h1>
                <p className="text-sm text-white/80">
                  Update the game settings with the same flow used during game
                  creation.
                </p>
              </div>
              <Badge
                className="w-fit border-white/25 bg-white/15 text-white backdrop-blur-sm"
                variant="outline"
              >
                {game.completedAt ? "Completed game" : "Active game"}
              </Badge>
            </div>
          </div>
        </GameTitleImage>

        <Card>
          <CardHeader className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-black">Settings</CardTitle>
                <p className="text-sm text-muted-foreground">{summary}</p>
              </div>
              {gameHasStarted ? (
                <Badge variant="outline">Live game</Badge>
              ) : null}
            </div>
            {game.completedAt ? (
              <p className="text-sm text-muted-foreground">
                Completed games can’t be changed.
              </p>
            ) : gameHasStarted ? (
              <p className="text-sm text-muted-foreground">
                Settings can’t be changed after scoring or rounds have been
                completed.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Change the rules before scoring or completing rounds.
              </p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {hasCustomPlayScreen ? (
              <Alert
                className={
                  customPlayScreenAvailable
                    ? "border-sky-500/35 bg-sky-500/5 text-sky-800 dark:text-sky-200"
                    : "border-destructive/40 bg-destructive/5"
                }
                variant={customPlayScreenAvailable ? "default" : "destructive"}
              >
                <CircleAlert />
                <AlertTitle>
                  {customPlayScreenAvailable
                    ? "Custom play screen available"
                    : "Custom play screen unavailable"}
                </AlertTitle>
                <AlertDescription>
                  {customPlayScreenAvailable
                    ? `${game.gameTitle?.title} uses a custom play screen with its game-title defaults. Changing these settings will switch this game to the standard play screen.`
                    : "The changed settings are not compatible with this title’s custom play screen. Restore the game-title defaults to use the custom screen."}
                </AlertDescription>
              </Alert>
            ) : null}
            <GameSettingsV2Editor
              currentSettings={currentSettings}
              defaultColor={game.gameTitle?.color}
              disabled={isLocked}
              disabledReason={disabledReason}
              draft={draft}
              itemizedMode="editor"
              onDraftChange={setDraft}
              onSectionOpenChange={setSectionOpen}
              onSectionTouchedChange={setSectionTouched}
              sectionOpen={sectionOpen}
              sectionTouched={sectionTouched}
              selectedColor={game.gameTitle?.color}
              titleSeed={titleSeed}
            />
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={!hasChanges || isPending}
                onClick={handleReset}
                type="button"
                variant="outline"
              >
                Reset
              </Button>
              <Button
                className="flex-1"
                disabled={isLocked || !hasChanges || isPending}
                onClick={handleSave}
                type="button"
              >
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
