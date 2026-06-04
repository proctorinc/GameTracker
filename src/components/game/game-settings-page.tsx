"use client";

import { updateGameSettings } from "@/app/actions/game";
import GameSettingsFields, {
  type EditableGameSettings,
} from "@/components/game/game-settings-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatResolvedEndingSummary } from "@/lib/game/title-defaults";
import type { GameForPlayPage } from "@/lib/db/store/game.store";
import { ArrowLeft, ChevronDown, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

function toEditableSettings(game: GameForPlayPage): EditableGameSettings {
  return {
    scoringMode: game.scoringMode,
    endingMode: game.endingMode,
    trackRounds: game.trackRounds,
    targetRounds: game.targetRounds?.toString() ?? "",
    scoreThreshold: game.scoreThreshold?.toString() ?? "",
    scoreThresholdDirection: game.scoreThresholdDirection,
  };
}

function formatScoringSummary(game: GameForPlayPage) {
  if (game.scoringMode === "no_score") {
    return "No score";
  }

  return game.scoringMode === "highest_wins"
    ? "Highest score wins"
    : "Lowest score wins";
}

function hasRecordedGameActivity(game: GameForPlayPage) {
  return (
    game.completedRounds > 0 ||
    game.players.some((player) => player.score !== 0) ||
    game.rounds.some((round) => round.scores.length > 0)
  );
}

function areSettingsEqual(
  left: EditableGameSettings,
  right: EditableGameSettings,
) {
  return (
    left.scoringMode === right.scoringMode &&
    left.endingMode === right.endingMode &&
    left.trackRounds === right.trackRounds &&
    left.targetRounds === right.targetRounds &&
    left.scoreThreshold === right.scoreThreshold &&
    left.scoreThresholdDirection === right.scoreThresholdDirection
  );
}

export default function GameSettingsPage({ game }: { game: GameForPlayPage }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initialSettings = useMemo(() => toEditableSettings(game), [game]);
  const [settings, setSettings] =
    useState<EditableGameSettings>(initialSettings);

  const gameHasStarted = hasRecordedGameActivity(game);
  const disableScoringModeSelection = gameHasStarted;
  const disableEndingModeSelection = gameHasStarted;
  const disableTrackRoundsSelection =
    gameHasStarted && game.endingMode === "none";
  const hasChanges = !areSettingsEqual(settings, initialSettings);

  const endingSummary = useMemo(
    () =>
      formatResolvedEndingSummary({
        scoringMode: settings.scoringMode ?? game.scoringMode,
        endingMode: settings.endingMode ?? game.endingMode,
        trackRounds: settings.trackRounds ?? game.trackRounds,
        targetRounds: Number(settings.targetRounds || game.targetRounds || 1),
        scoreThreshold: Number(
          settings.scoreThreshold || game.scoreThreshold || 100,
        ),
        scoreThresholdDirection:
          settings.scoreThresholdDirection ??
          game.scoreThresholdDirection ??
          "at_least",
      }),
    [game, settings],
  );

  function handleReset() {
    setSettings(initialSettings);
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateGameSettings({
          gameId: game.id,
          scoringMode: settings.scoringMode ?? game.scoringMode,
          endingMode: settings.endingMode ?? game.endingMode,
          trackRounds: settings.trackRounds ?? game.trackRounds,
          targetRounds:
            settings.endingMode === "round_count"
              ? Number(settings.targetRounds)
              : null,
          scoreThreshold:
            settings.endingMode === "score_threshold" &&
            settings.scoringMode !== "no_score"
              ? Number(settings.scoreThreshold)
              : null,
          scoreThresholdDirection:
            settings.endingMode === "score_threshold" &&
            settings.scoringMode !== "no_score"
              ? settings.scoreThresholdDirection
              : null,
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

  return (
    <div className="min-h-screen px-4 pb-32">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-black/5 p-6 text-white shadow-xl"
          style={{ backgroundColor: game.gameTitle?.color ?? "#475569" }}
        >
          {game.gameTitle?.imageUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-35"
              style={{ backgroundImage: `url("${game.gameTitle.imageUrl}")` }}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/30 to-transparent" />
          <div className="relative z-10 flex flex-col gap-4">
            <Link
              className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              href={`/game/${game.id}/play`}
            >
              <ArrowLeft className="size-4" />
              Back to game
            </Link>
            <div className="space-y-3">
              <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tight">
                  {game.gameTitle?.title ?? "Untitled game"}
                </h1>
                <p className="text-sm text-white/80">
                  Update the game scoring and end condition
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
        </div>

        <Card>
          <CardHeader className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-black">Settings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatScoringSummary(game)} · {endingSummary}
                </p>
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
                Settings cannot be update after scoring or rounds have been
                completed
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Change the rules before scoring or completing rounds
              </p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <details className="group rounded-2xl border border-border bg-muted/60">
              <summary className="flex list-none cursor-pointer items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Rules</p>
                  <p className="text-sm text-muted-foreground">
                    {formatScoringSummary({
                      ...game,
                      scoringMode: settings.scoringMode ?? game.scoringMode,
                    })}{" "}
                    · {endingSummary}
                  </p>
                </div>
                <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>

              <div className="border-t border-border px-4 py-4">
                <GameSettingsFields
                  allowUnset={false}
                  disabledEndingMode={
                    disableEndingModeSelection || Boolean(game.completedAt)
                  }
                  disabledScoringMode={
                    disableScoringModeSelection || Boolean(game.completedAt)
                  }
                  disabledTrackRounds={
                    disableTrackRoundsSelection || Boolean(game.completedAt)
                  }
                  endingModeHelpText={
                    gameHasStarted
                      ? "Changing the overall ending mode after play starts can make existing rounds and prompts misleading."
                      : null
                  }
                  onChange={setSettings}
                  scoringModeHelpText={
                    gameHasStarted
                      ? "Scoring mode is locked after scorekeeping begins so past scores keep the same meaning."
                      : null
                  }
                  trackRoundsHelpText={
                    disableTrackRoundsSelection
                      ? "Round visibility is locked after activity starts so recorded rounds don’t disappear from the game."
                      : null
                  }
                  value={settings}
                />
              </div>
            </details>
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
                disabled={
                  Boolean(game.completedAt) ||
                  !hasChanges ||
                  isPending
                }
                onClick={handleSave}
                type="button"
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
