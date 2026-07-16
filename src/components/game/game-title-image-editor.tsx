"use client";
/* eslint-disable @next/next/no-img-element */

import {
  generateGameTitleImage,
  getSavedGameTitleImageOptions,
  prepareUploadedGameTitleImage,
  saveGameTitleImage,
  saveGeneratedGameTitleImage,
  saveUploadedGameTitleImage,
} from "@/app/actions/game";
import GameTitleImage from "@/components/game/game-title-image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GameTitleBase } from "@/lib/db/store/game.store";
import {
  type TitleImageCandidate,
} from "@/lib/title-image-color";
import {
  DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS,
  getTitleImageObjectPosition,
} from "@/lib/title-image";
import { cn } from "@/lib/utils";
import { ImagePlus, RefreshCcw, Sparkles, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type GeneratedTitleImageState = TitleImageCandidate & {
  prompt: string;
  model: string;
};

type UploadPreviewState = TitleImageCandidate & {
  file: File;
  objectUrl: string;
};

type SavedImageOptionsState = Pick<
  TitleImageCandidate,
  "colorOptions" | "selectedColor" | "verticalFocus"
>;

type PreviewSizeOption = {
  id: "thumbnail" | "card" | "hero";
  label: string;
  description: string;
  className: string;
  variant: "thumbnail" | "card" | "hero";
};

const PREVIEW_SIZE_OPTIONS: PreviewSizeOption[] = [
  {
    id: "thumbnail",
    label: "Compact",
    description: "Small tile",
    className: "h-28 w-full",
    variant: "thumbnail",
  },
  {
    id: "card",
    label: "Standard",
    description: "Default card",
    className: "h-48 w-full",
    variant: "card",
  },
  {
    id: "hero",
    label: "Hero",
    description: "Large banner",
    className: "h-64 w-full",
    variant: "hero",
  },
];

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
  const [savedImageOptions, setSavedImageOptions] =
    useState<SavedImageOptionsState | null>(null);
  const [selectedColor, setSelectedColor] = useState(title.color);
  const [verticalFocus, setVerticalFocus] = useState(
    title.imageVerticalFocus ?? DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS,
  );
  const [previewSize, setPreviewSize] =
    useState<PreviewSizeOption["id"]>("card");
  const [previewErrored, setPreviewErrored] = useState(false);

  useEffect(() => {
    return () => {
      if (uploadPreview) {
        URL.revokeObjectURL(uploadPreview.objectUrl);
      }
    };
  }, [uploadPreview]);

  useEffect(() => {
    if (!title.imageUrl || generatedImage || uploadPreview) {
      return;
    }

    let cancelled = false;

    startTransition(async () => {
      try {
        const options = await getSavedGameTitleImageOptions({
          gameTitleId: title.id,
        });

        if (cancelled) {
          return;
        }

        setSavedImageOptions(options);
        setSelectedColor(options.selectedColor);
        setVerticalFocus(options.verticalFocus);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load image color options",
          );
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [generatedImage, title.id, title.imageUrl, uploadPreview]);

  const activeCandidate = generatedImage ?? uploadPreview;
  const activePreviewUrl =
    uploadPreview?.objectUrl || generatedImage?.previewUrl || title.imageUrl;
  const hasCurrentSavedImage = Boolean(title.imageUrl);
  const previewLabel = generatedImage
    ? "Generated preview"
    : uploadPreview
      ? "Upload preview"
      : "Current saved image";
  const activePreviewSize =
    PREVIEW_SIZE_OPTIONS.find((option) => option.id === previewSize) ??
    PREVIEW_SIZE_OPTIONS[1];
  const previewColor = selectedColor;
  const hasUnsavedCandidate = Boolean(generatedImage || uploadPreview);
  const hasSavedImageColorChanges =
    !hasUnsavedCandidate && hasCurrentSavedImage && selectedColor !== title.color;
  const hasSavedImageCropChanges =
    !hasUnsavedCandidate &&
    hasCurrentSavedImage &&
    verticalFocus !==
      (title.imageVerticalFocus ?? DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS);
  const hasSavedImageChanges =
    hasSavedImageCropChanges || hasSavedImageColorChanges;
  const helperText = useMemo(() => {
    if (generatedImage) {
      return `Generated with ${generatedImage.model}. Fine-tune the color, then confirm to save.`;
    }

    if (uploadPreview) {
      return "Adjust the crop, pick a color, then confirm to upload this image to S3.";
    }

    if (hasCurrentSavedImage) {
      return "Adjust the crop or choose a different image-derived color, then save the updated title styling.";
    }

    return "Upload a file or generate a new image to unlock crop and color controls.";
  }, [generatedImage, hasCurrentSavedImage, uploadPreview]);

  function resetDraftState() {
    setSelectedColor(title.color);
    setVerticalFocus(title.imageVerticalFocus ?? DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS);
    setSavedImageOptions((current) =>
      current
        ? {
            ...current,
            selectedColor: title.color,
            verticalFocus:
              title.imageVerticalFocus ?? DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS,
          }
        : current,
    );
  }

  function resetUploadPreview() {
    setUploadPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current.objectUrl);
      }

      return null;
    });
    resetDraftState();
    setPreviewErrored(false);
  }

  function resetGeneratedImage() {
    setGeneratedImage(null);
    resetDraftState();
    setPreviewErrored(false);
  }

  function applyCandidateState(
    candidate: TitleImageCandidate,
    overrides?: Partial<Pick<TitleImageCandidate, "selectedColor" | "verticalFocus">>,
  ) {
    setSelectedColor(
      overrides?.selectedColor &&
        candidate.colorOptions.includes(overrides.selectedColor)
        ? overrides.selectedColor
        : candidate.selectedColor,
    );
    setVerticalFocus(overrides?.verticalFocus ?? candidate.verticalFocus);
  }

  function buildUploadPreviewFormData(file: File, nextVerticalFocus: number) {
    const formData = new FormData();
    formData.set("gameTitleId", title.id);
    formData.set("file", file);
    formData.set("imageVerticalFocus", String(nextVerticalFocus));

    return formData;
  }

  function handleFileChange(file: File | null) {
    resetGeneratedImage();

    if (!file) {
      resetUploadPreview();
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const nextVerticalFocus =
      title.imageVerticalFocus ?? DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS;

    startTransition(async () => {
      try {
        const candidate = await prepareUploadedGameTitleImage(
          buildUploadPreviewFormData(file, nextVerticalFocus),
        );
        setUploadPreview((current) => {
          if (current) {
            URL.revokeObjectURL(current.objectUrl);
          }

          return {
            ...candidate,
            file,
            objectUrl,
          };
        });
        applyCandidateState(candidate);
        setPreviewErrored(false);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        toast.error(
          error instanceof Error ? error.message : "Could not prepare title image",
        );
      }
    });
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
        applyCandidateState(candidate);
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
        formData.set("selectedColor", selectedColor);
        formData.set("imageVerticalFocus", String(verticalFocus));
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
          selectedColor,
          imageVerticalFocus: verticalFocus,
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

  function handleSaveCurrentImageCrop() {
    if (!title.imageUrl) {
      return;
    }

    startTransition(async () => {
      try {
        await saveGameTitleImage({
          gameTitleId: title.id,
          imageUrl: title.imageUrl,
          imageVerticalFocus: verticalFocus,
          selectedColor,
        });
        toast.success("Title image updated");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not update title crop",
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
          <div className="flex flex-wrap gap-2">
            {PREVIEW_SIZE_OPTIONS.map((option) => {
              const isSelected = option.id === activePreviewSize.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPreviewSize(option.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-left transition-colors",
                    isSelected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:bg-muted",
                  )}
                >
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span
                    className={cn(
                      "block text-xs",
                      isSelected ? "text-background/80" : "text-muted-foreground",
                    )}
                  >
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            className="overflow-hidden rounded-xl border border-border"
            style={{ backgroundColor: normalizeValue(previewColor) || "#475569" }}
          >
            {activePreviewUrl && !previewErrored ? (
              <GameTitleImage
                className={activePreviewSize.className}
                color={previewColor}
                contentClassName="h-full"
                imageUrl={activePreviewUrl}
                verticalFocus={verticalFocus}
                variant={activePreviewSize.variant}
              >
                <div className="relative h-full w-full">
                  <img
                    alt={`${title.title} preview`}
                    className="sr-only"
                    onError={() => setPreviewErrored(true)}
                    onLoad={() => setPreviewErrored(false)}
                    src={activePreviewUrl}
                    style={{
                      objectPosition: getTitleImageObjectPosition(verticalFocus),
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 z-20">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/80 shadow-[0_0_0_1px_rgba(15,23,42,0.18)]" />
                  </div>
                </div>
              </GameTitleImage>
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

        <div className="space-y-4 rounded-xl border border-border/70 bg-muted/30 p-4">
          <div className="space-y-1">
            <h3 className="font-semibold">Crop and color</h3>
            <p className="text-sm text-muted-foreground">
              Use the slider to nudge tall artwork up or down, then choose the best-fitting accent color.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="font-medium" htmlFor={`title-focus-${title.id}`}>
                Vertical image focus
              </label>
              <span className="text-xs text-muted-foreground">
                {verticalFocus}%
              </span>
            </div>
            <input
              id={`title-focus-${title.id}`}
              min="0"
              max="100"
              step="1"
              type="range"
              value={verticalFocus}
              disabled={isPending || !activePreviewUrl}
              onChange={(event) =>
                setVerticalFocus(Number.parseInt(event.target.value, 10))
              }
              className={cn(
                "h-6 w-full cursor-pointer accent-foreground",
                (isPending || !activePreviewUrl) &&
                  "cursor-not-allowed opacity-50",
              )}
            />
          </div>
          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Title color</p>
              <p className="text-xs text-muted-foreground">
                Pick the accent that works best with this artwork
              </p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(
                activeCandidate?.colorOptions ??
                savedImageOptions?.colorOptions ??
                [title.color]
              ).map((option) => {
                const isSelected = option === selectedColor;

                return (
                  <button
                    key={option}
                    type="button"
                    aria-label={`Choose color ${option}`}
                    aria-pressed={isSelected}
                    disabled={isPending || (!activeCandidate && !savedImageOptions)}
                    onClick={() => setSelectedColor(option)}
                    className={cn(
                      "h-10 rounded-xl border-2 transition-transform hover:scale-[1.02]",
                      isSelected
                        ? "border-foreground ring-2 ring-ring/30 shadow-sm"
                        : "border-transparent shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
                      (isPending || (!activeCandidate && !savedImageOptions)) &&
                        "cursor-wait opacity-70",
                    )}
                    style={{ backgroundColor: option }}
                  />
                );
              })}
            </div>
          </div>
          {hasSavedImageChanges ? (
            <div className="flex gap-3">
              <Button
                type="button"
                disabled={isPending}
                onClick={handleSaveCurrentImageCrop}
              >
                <Upload className="size-4" />
                Save changes
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={resetDraftState}
              >
                Cancel crop changes
              </Button>
            </div>
          ) : null}
        </div>

        {previewErrored ? (
          <Alert>
            <AlertTitle>Preview unavailable</AlertTitle>
            <AlertDescription>
              The selected image could not be shown in the browser preview.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
          <div className="space-y-1">
            <h3 className="font-semibold">Upload from your computer</h3>
            <p className="text-sm text-muted-foreground">
              Choose artwork, adjust the crop if needed, then confirm to upload it to S3.
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

        <div className="space-y-4 rounded-xl border border-border/70 bg-muted/30 p-4">
          <div className="space-y-1">
            <h3 className="font-semibold">Generate with AI</h3>
            <p className="text-sm text-muted-foreground">
              Edit the game name or prompt, then generate title art and choose the best accent color.
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
