"use client";

import { useState, useTransition } from "react";
import { Layers3, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { setCardsFeatureEnabled } from "@/app/actions/feature-flags";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AdminCardsFeatureToggle({
  initiallyEnabled,
}: {
  initiallyEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [isPending, startTransition] = useTransition();

  function toggleCards() {
    const nextEnabled = !enabled;
    startTransition(async () => {
      try {
        await setCardsFeatureEnabled(nextEnabled);
        setEnabled(nextEnabled);
        toast.success(
          nextEnabled
            ? "Cards are now available to all users"
            : "Cards are now hidden and disabled",
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to update cards",
        );
      }
    });
  }

  return (
    <Card className={enabled ? "border-emerald-500/40" : "border-amber-500/40"}>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/50">
            <Layers3 className="size-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg font-black">Cards for users</CardTitle>
              <Badge variant={enabled ? "default" : "outline"}>
                {enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <CardDescription>
              {enabled
                ? "Users can earn, open, and view collectible cards."
                : "Card rewards, packs, collections, and card routes are hidden from users. You can still configure the catalog."}
            </CardDescription>
          </div>
        </div>
        <Button
          aria-checked={enabled}
          className="shrink-0"
          disabled={isPending}
          onClick={toggleCards}
          role="switch"
          type="button"
          variant={enabled ? "outline" : "default"}
        >
          {isPending ? <LoaderCircle className="animate-spin" /> : null}
          {enabled ? "Disable cards" : "Enable cards"}
        </Button>
      </CardHeader>
    </Card>
  );
}
