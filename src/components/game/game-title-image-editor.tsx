"use client";
/* eslint-disable @next/next/no-img-element */

import { saveGameTitleImage } from "@/app/actions/game";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { GameTitleBase } from "@/lib/db/store/game.store";
import { ImageOff, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

function normalizeValue(value: string) {
  return value.trim();
}

type PreviewState = "current" | "unsaved" | "error" | "empty";

export default function GameTitleImageEditor({
  title,
}: {
  title: GameTitleBase;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState(title.imageUrl);
  const [previewErrored, setPreviewErrored] = useState(false);

  const normalizedInitialValue = normalizeValue(title.imageUrl);
  const normalizedCurrentValue = normalizeValue(imageUrl);
  const hasChanges = normalizedCurrentValue !== normalizedInitialValue;
  const previewState: PreviewState = !normalizedCurrentValue
    ? "empty"
    : previewErrored
      ? "error"
      : normalizedCurrentValue === normalizedInitialValue
        ? "current"
        : "unsaved";
  const previewLabel = useMemo(() => {
    switch (previewState) {
      case "current":
        return "Current saved image";
      case "unsaved":
        return "Unsaved preview";
      case "error":
        return "Preview unavailable";
      case "empty":
      default:
        return "Image will be removed";
    }
  }, [previewState]);

  function handleReset() {
    setImageUrl(title.imageUrl);
    setPreviewErrored(false);
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveGameTitleImage({
          gameTitleId: title.id,
          imageUrl,
        });
        toast.success("Title image updated");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not update title image",
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="text-xl font-black">Title artwork</CardTitle>
        <p className="text-sm text-muted-foreground">
          Save a new image URL to update both the title art and its main color.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`image-url-${title.id}`}>
            Image URL
          </label>
          <div className="relative">
            <Link2 className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`image-url-${title.id}`}
              className="pl-11"
              disabled={isPending}
              onChange={(event) => {
                setImageUrl(event.target.value);
                setPreviewErrored(false);
              }}
              placeholder="https://example.com/title-art.jpg"
              value={imageUrl}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Preview</p>
            <p className="text-xs text-muted-foreground">{previewLabel}</p>
          </div>
          <div className="overflow-hidden rounded-[1.5rem] border border-border bg-muted/50">
            {normalizedCurrentValue && !previewErrored ? (
              <img
                alt={`${title.title} preview`}
                className="h-48 w-full object-cover"
                onError={() => setPreviewErrored(true)}
                onLoad={() => setPreviewErrored(false)}
                src={normalizedCurrentValue}
              />
            ) : (
              <div className="flex h-48 w-full flex-col items-center justify-center gap-3 px-6 text-center">
                <ImageOff className="size-8 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {previewState === "error"
                      ? "We couldn't load that preview."
                      : "No image selected."}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {previewState === "error"
                      ? "You can still try saving, but the server will reject invalid or unreachable images."
                      : "Clearing the URL removes the image and picks a fresh title color."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {previewState === "error" ? (
          <Alert>
            <AlertTitle>Preview unavailable</AlertTitle>
            <AlertDescription>
              The browser couldn&apos;t load this image. Saving will still verify
              the URL on the server before any changes are stored.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex gap-3">
          <Button
            className="flex-1"
            disabled={isPending || !hasChanges}
            onClick={handleReset}
            type="button"
            variant="outline"
          >
            Reset
          </Button>
          <Button
            className="flex-1"
            disabled={isPending || !hasChanges}
            onClick={handleSave}
            type="button"
          >
            Save image
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
