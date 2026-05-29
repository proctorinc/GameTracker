"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardEmpty, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GameTitleLibraryEntry } from "@/lib/db/store/game.store";
import { ArrowRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export default function CreateGameTitleStep({
  gameTitles,
  initialTitleId,
  initialNewTitle,
}: {
  gameTitles: GameTitleLibraryEntry[];
  initialTitleId: string | null;
  initialNewTitle: string | null;
}) {
  const router = useRouter();
  const [selectedTitleId, setSelectedTitleId] = useState(initialTitleId ?? "");
  const [newTitle, setNewTitle] = useState(initialNewTitle ?? "");

  const selectedTitle = useMemo(
    () => gameTitles.find((title) => title.id === selectedTitleId) ?? null,
    [gameTitles, selectedTitleId],
  );

  function handleContinue() {
    const params = new URLSearchParams();

    if (newTitle.trim()) {
      params.set("newTitle", newTitle.trim());
    } else if (selectedTitleId) {
      params.set("titleId", selectedTitleId);
    } else {
      return;
    }

    router.push(`/game/create/settings?${params.toString()}`);
  }

  const canContinue = Boolean(newTitle.trim() || selectedTitleId);

  return (
    <div className="min-h-screen px-4 overflow-y-auto pb-24">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black">Choose a game</h1>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-black">Your library</h2>
            <p className="text-sm text-muted-foreground">
              Includes your titles and universal titles.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {gameTitles.length === 0 ? (
              <CardEmpty className="w-full">
                No saved or universal titles yet. Enter a new title below to
                create your first one.
              </CardEmpty>
            ) : (
              gameTitles.map((title) => {
                const isSelected =
                  title.id === selectedTitleId && !newTitle.trim();

                return (
                  <button
                    key={title.id}
                    className={cn(
                      "relative flex min-h-32 flex-1 basis-[46%] flex-col justify-between overflow-hidden rounded-3xl p-4 text-left transition",
                      isSelected
                        ? "text-background shadow-sm ring-4 ring-border scale-105"
                        : "border-border text-foreground hover:opacity-95",
                    )}
                    onClick={() => {
                      setSelectedTitleId(title.id);
                      setNewTitle("");
                    }}
                    type="button"
                    style={{
                      backgroundColor: title.color,
                      borderColor: title.color,
                    }}
                  >
                    {title.imageUrl ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-45"
                        style={{ backgroundImage: `url("${title.imageUrl}")` }}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-linear-to-t from-white/60 via-white/35 dark:from-black/80 dark:via-black/35 to-transparent" />
                    <div className="relative z-10 flex h-full flex-col justify-between">
                      <span className="text-lg font-black text-white drop-shadow-sm">
                        {title.title}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-black">Create new title</h2>
            <p className="text-sm text-muted-foreground">
              If it matches an existing title, we&apos;ll reuse that title.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              className="h-14 rounded-[1.4rem] px-4 text-lg"
              onChange={(event) => {
                setNewTitle(event.target.value);
                if (event.target.value.trim()) {
                  setSelectedTitleId("");
                }
              }}
              placeholder="Enter a title"
              value={newTitle}
            />
            {selectedTitle ? (
              <div className="rounded-2xl border border-border bg-muted/60 p-4 text-sm text-muted-foreground">
                Selected title:{" "}
                <span className="font-bold text-foreground">
                  {selectedTitle.title}
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Button
          className="h-14 rounded-[1.4rem] text-base font-bold"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          Continue to settings
          {canContinue ? (
            <ArrowRight className="size-5" />
          ) : (
            <Plus className="size-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
