"use client";
/* eslint-disable @next/next/no-img-element */

import {
  generateGameTitleImage,
  saveGeneratedGameTitleImage,
  saveUploadedGameTitleImage,
} from "@/app/actions/game";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GameTitleBase } from "@/lib/db/store/game.store";
import type { TitleImageCandidate } from "@/lib/title-image-color";
import { ImagePlus, RefreshCcw, Sparkles, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type GeneratedTitleImageState = TitleImageCandidate & {
  prompt: string;
  model: string;
};

type UploadPreviewState = {
  file: File;
  previewUrl: string;
};

function normalizeValue(value: string) {
  return value.trim();
}

function buildDefaultPrompt(gameName: string) {
  const safeGameName = gameName.trim() || "Unknown game";

  return [
    `Generate an image of the box art for the game ${safeGameName}. If this is a real game, try and provide an accurate box art image of the game.`,
    "Don't make it realistic, make it box art.",
    "Don't include people or words. Just a visual that represents box art for the game.",
    "Make a landscape image.",
  ].join("\n\n");
}

export default function GameTitleImageEditor({
  title,
}: {
  title: GameTitleBase;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [gameName, setGameName] = useState(title.title);
  const [prompt, setPrompt] = useState(buildDefaultPrompt(title.title));
  const [promptDirty, setPromptDirty] = useState(false);
  const [generatedImage, setGeneratedImage] =
    useState<GeneratedTitleImageState | null>(null);
  const [uploadPreview, setUploadPreview] = useState<UploadPreviewState | null>(
    null,
  );
  const [previewErrored, setPreviewErrored] = useState(false);

  useEffect(() => {
    return () => {
      if (uploadPreview) {
        URL.revokeObjectURL(uploadPreview.previewUrl);
      }
    };
  }, [uploadPreview]);

  const activePreviewUrl =
    generatedImage?.previewUrl || uploadPreview?.previewUrl || title.imageUrl;
  const previewLabel = generatedImage
    ? "Generated preview"
    : uploadPreview
      ? "Upload preview"
      : "Current saved image";
  const previewColor = generatedImage?.color ?? title.color;
  const hasUnsavedCandidate = Boolean(generatedImage || uploadPreview);
  const helperText = useMemo(() => {
    if (generatedImage) {
      return `Generated with ${generatedImage.model}. Confirm to upload to S3 or re-roll.`;
    }

    if (uploadPreview) {
      return "Confirm to upload this image to S3 and update the title color.";
    }

    return "Upload a file or generate a new image, then confirm to save it.";
  }, [generatedImage, uploadPreview]);

  function resetUploadPreview() {
    setUploadPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return null;
    });
    setPreviewErrored(false);
  }

  function resetGeneratedImage() {
    setGeneratedImage(null);
    setPreviewErrored(false);
  }

  function handleFileChange(file: File | null) {
    resetGeneratedImage();

    if (!file) {
      resetUploadPreview();
      return;
    }

    setUploadPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return {
        file,
        previewUrl: URL.createObjectURL(file),
      };
    });
    setPreviewErrored(false);
  }

  function handleGenerate() {
    resetUploadPreview();

    startTransition(async () => {
      try {
        const candidate = await generateGameTitleImage({
          gameTitleId: title.id,
          gameName,
          prompt,
        });
        setGeneratedImage(candidate);
        toast.success("New title art generated");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not generate title art",
        );
      }
    });
  }

  function handleSaveUpload() {
    if (!uploadPreview) {
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("gameTitleId", title.id);
        formData.set("file", uploadPreview.file);
        await saveUploadedGameTitleImage(formData);
        toast.success("Title image uploaded");
        resetUploadPreview();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not upload title image",
        );
      }
    });
  }

  function handleSaveGenerated() {
    if (!generatedImage) {
      return;
    }

    startTransition(async () => {
      try {
        await saveGeneratedGameTitleImage({
          gameTitleId: title.id,
          previewUrl: generatedImage.previewUrl,
        });
        toast.success("Generated title image saved");
        resetGeneratedImage();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save generated image",
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="text-xl font-black">Title artwork</CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload an image or generate one with AI, then confirm to save it to S3.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Preview</p>
            <p className="text-xs text-muted-foreground">{previewLabel}</p>
          </div>
          <div
            className="overflow-hidden rounded-[1.5rem] border border-border"
            style={{ backgroundColor: normalizeValue(previewColor) || "#475569" }}
          >
            {activePreviewUrl && !previewErrored ? (
              <img
                alt={`${title.title} preview`}
                className="h-48 w-full object-cover"
                onError={() => setPreviewErrored(true)}
                onLoad={() => setPreviewErrored(false)}
                src={activePreviewUrl}
              />
            ) : (
              <div className="flex h-48 w-full flex-col items-center justify-center gap-3 px-6 text-center text-white">
                <ImagePlus className="size-8 opacity-80" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {previewErrored
                      ? "We couldn't load that preview."
                      : "No image selected."}
                  </p>
                  <p className="text-sm text-white/80">{helperText}</p>
                </div>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{helperText}</p>
        </div>

        {previewErrored ? (
          <Alert>
            <AlertTitle>Preview unavailable</AlertTitle>
            <AlertDescription>
              The selected image could not be shown in the browser preview.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-3 rounded-[1.5rem] border border-border/70 bg-muted/30 p-4">
          <div className="space-y-1">
            <h3 className="font-semibold">Upload from your computer</h3>
            <p className="text-sm text-muted-foreground">
              Choose artwork and confirm to upload it to S3.
            </p>
          </div>
          <label
            className="text-sm font-medium"
            htmlFor={`title-upload-${title.id}`}
          >
            Image file
          </label>
          <Input
            accept="image/*"
            disabled={isPending}
            id={`title-upload-${title.id}`}
            onChange={(event) =>
              handleFileChange(event.currentTarget.files?.[0] ?? null)
            }
            type="file"
          />
          <div className="flex gap-3">
            <Button
              className="flex-1"
              disabled={isPending || !uploadPreview}
              onClick={handleSaveUpload}
              type="button"
            >
              <Upload className="size-4" />
              Confirm and save
            </Button>
            <Button
              className="flex-1"
              disabled={isPending || !uploadPreview}
              onClick={resetUploadPreview}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-[1.5rem] border border-border/70 bg-muted/30 p-4">
          <div className="space-y-1">
            <h3 className="font-semibold">Generate with AI</h3>
            <p className="text-sm text-muted-foreground">
              Edit the game name or prompt, then generate a landscape box-art image.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`game-name-${title.id}`}>
              Game name
            </label>
            <Input
              id={`game-name-${title.id}`}
              disabled={isPending}
              onChange={(event) => {
                const nextGameName = event.target.value;
                setGameName(nextGameName);

                if (!promptDirty) {
                  setPrompt(buildDefaultPrompt(nextGameName));
                }
              }}
              value={gameName}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`game-prompt-${title.id}`}>
              Prompt
            </label>
            <Textarea
              id={`game-prompt-${title.id}`}
              disabled={isPending}
              onChange={(event) => {
                setPrompt(event.target.value);
                setPromptDirty(true);
              }}
              rows={7}
              value={prompt}
            />
          </div>

          <div className="flex gap-3">
            <Button disabled={isPending} onClick={handleGenerate} type="button">
              <Sparkles className="size-4" />
              {generatedImage ? "Re-roll image" : "Generate image"}
            </Button>
            <Button
              disabled={isPending || !generatedImage}
              onClick={handleSaveGenerated}
              type="button"
              variant="outline"
            >
              <Upload className="size-4" />
              Confirm and save
            </Button>
            <Button
              disabled={isPending || !generatedImage}
              onClick={resetGeneratedImage}
              type="button"
              variant="ghost"
            >
              <RefreshCcw className="size-4" />
              Cancel
            </Button>
          </div>
        </div>

        {hasUnsavedCandidate ? (
          <Alert>
            <AlertTitle>Unsaved artwork</AlertTitle>
            <AlertDescription>
              This preview is not live yet. Confirm and save to upload it to S3 and
              update the stored title art URL.
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
