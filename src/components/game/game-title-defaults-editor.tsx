"use client";

import { saveGameTitleDefaults } from "@/app/actions/game";
import GameSettingsFields, {
  type EditableGameSettings,
} from "@/components/game/game-settings-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GameTitleBase } from "@/lib/db/store/game.store";
import { normalizeGameTitleDefaults } from "@/lib/game/title-defaults";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

function toEditableSettings(title: GameTitleBase): EditableGameSettings {
  const normalized = normalizeGameTitleDefaults(title);

  return {
    scoringMode: normalized.defaultScoringMode,
    endingMode: normalized.defaultEndingMode,
    targetRounds: normalized.defaultTargetRounds?.toString() ?? "",
    scoreThreshold: normalized.defaultScoreThreshold?.toString() ?? "",
    scoreThresholdDirection: normalized.defaultScoreThresholdDirection,
  };
}

export default function GameTitleDefaultsEditor({
  title,
}: {
  title: GameTitleBase;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<EditableGameSettings>(
    toEditableSettings(title),
  );

  function handleReset() {
    setSettings(toEditableSettings(title));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveGameTitleDefaults({
          gameTitleId: title.id,
          defaultScoringMode: settings.scoringMode,
          defaultEndingMode: settings.endingMode,
          defaultTargetRounds: settings.targetRounds
            ? Number(settings.targetRounds)
            : null,
          defaultScoreThreshold: settings.scoreThreshold
            ? Number(settings.scoreThreshold)
            : null,
          defaultScoreThresholdDirection: settings.scoreThresholdDirection,
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-xl font-black">Saved defaults</CardTitle>
          <p className="text-sm text-muted-foreground">
            These are used as the starting settings when someone picks this
            title.
          </p>
        </div>
        <Badge variant="outline">
          {title.isUniversal ? "Admin only" : "Owner only"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <GameSettingsFields
          allowUnset
          onChange={setSettings}
          value={settings}
        />
        <div className="flex gap-3">
          <Button
            className="flex-1"
            disabled={isPending}
            onClick={handleReset}
            type="button"
            variant="outline"
          >
            Reset
          </Button>
          <Button
            className="flex-1"
            disabled={isPending}
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
