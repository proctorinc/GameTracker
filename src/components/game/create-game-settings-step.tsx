"use client";

import { createConfiguredGame } from "@/app/actions/game";
import GameSettingsFields, {
  type EditableGameSettings,
} from "@/components/game/game-settings-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ConcreteGameSettings } from "@/lib/game/title-defaults";
import { formatResolvedEndingSummary } from "@/lib/game/title-defaults";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ChevronDown,
  LoaderCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type DraftTitle =
  | { titleId: string; newTitle: null; label: string }
  | { titleId: null; newTitle: string; label: string };

export default function CreateGameSettingsStep({
  draftTitle,
  initialSettings,
}: {
  draftTitle: DraftTitle;
  initialSettings: ConcreteGameSettings;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<EditableGameSettings>({
    scoringMode: initialSettings.scoringMode,
    endingMode: initialSettings.endingMode,
    targetRounds: String(initialSettings.targetRounds),
    scoreThreshold: String(initialSettings.scoreThreshold),
    scoreThresholdDirection: initialSettings.scoreThresholdDirection,
  });

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

  function goBack() {
    const params = new URLSearchParams();

    if (draftTitle.titleId) {
      params.set("titleId", draftTitle.titleId);
    }

    if (draftTitle.newTitle) {
      params.set("newTitle", draftTitle.newTitle);
    }

    router.push(`/game/create?${params.toString()}`);
  }

  function handleCreateGame() {
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
          <h1 className="text-4xl font-black">Configure game</h1>
          <p className="text-sm text-muted-foreground">
            Confirm the rules for this v1 game before you start playing.
          </p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-black">Selected title</h2>
          </CardHeader>
          <CardContent>
            <button
              className="flex w-full items-center justify-between rounded-3xl border border-border bg-muted/60 px-4 py-4 text-left transition hover:bg-muted"
              onClick={goBack}
              type="button"
            >
              <div>
                <p className="text-lg font-black">{draftTitle.label}</p>
                <p className="text-sm text-muted-foreground">
                  {draftTitle.titleId ? "From your library" : "New title"} · Tap
                  to change game
                </p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="outline">Change</Badge>
                <ArrowLeftRight className="size-4" />
              </div>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-black">Settings</h2>
          </CardHeader>
          <CardContent>
            <details className="group rounded-3xl border border-border bg-muted/60">
              <summary className="flex list-none cursor-pointer items-center justify-between gap-3 px-4 py-4">
                <div>
                  <p className="font-black">Defaults</p>
                  <p className="text-sm text-muted-foreground">
                    {scoringSummary} · {endingSummary}
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    Open to change defaults
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

        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-14 rounded-[1.4rem]"
            onClick={goBack}
            type="button"
            variant="outline"
          >
            <ArrowLeft className="size-5" />
            Back
          </Button>
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
        </div>
      </div>
    </div>
  );
}
