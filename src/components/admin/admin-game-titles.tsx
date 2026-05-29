"use client";

import {
  mergeTitleIntoAnother,
  promoteTitleToUniversal,
} from "@/app/actions/game";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminGameTitleEntry } from "@/lib/db/store/game.store";
import { GitMerge, Search, Sparkles } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

function asSelectValue(value: string | null) {
  return value ?? "";
}

export default function AdminGameTitles({
  titles,
}: {
  titles: AdminGameTitleEntry[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const filteredTitles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return titles;
    }

    return titles.filter((title) => {
      const haystack = [
        title.title,
        title.normalizedTitle,
        title.creatorName ?? "",
        title.isUniversal ? "universal" : "personal",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query, titles]);

  function runAction(action: () => Promise<void>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Something went wrong",
        );
      }
    });
  }

  const universalCount = titles.filter((title) => title.isUniversal).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Titles</CardTitle>
          </CardHeader>
          <CardContent className="text-5xl text-center font-black">
            {titles.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Universal</CardTitle>
          </CardHeader>
          <CardContent className="text-5xl text-center font-black">
            {universalCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Personal</CardTitle>
          </CardHeader>
          <CardContent className="text-5xl text-center font-black">
            {titles.length - universalCount}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-black">
            Review game titles
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 rounded-[1.2rem] pl-11"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles or creators"
              value={query}
            />
          </div>

          <div className="flex flex-col gap-3">
            {filteredTitles.map((title) => (
              <Card key={title.id} className="rounded-[1.5rem] border border-border/80 bg-card/95">
                <CardContent className="flex flex-col gap-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="h-14 w-14 shrink-0 rounded-2xl bg-cover bg-center shadow-sm"
                        style={{
                          backgroundColor: title.color,
                          backgroundImage: title.imageUrl
                            ? `url("${title.imageUrl}")`
                            : undefined,
                        }}
                      />
                      <div className="min-w-0">
                        <Link
                          className="truncate text-xl font-black hover:underline"
                          href={`/titles/${title.id}`}
                        >
                          {title.title}
                        </Link>
                      <p className="text-sm text-muted-foreground">
                        normalized: {title.normalizedTitle}
                      </p>
                    </div>
                    </div>
                    <Badge variant={title.isUniversal ? "default" : "outline"}>
                      {title.isUniversal ? "Universal" : "Personal"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>Owners: {title.ownerCount}</span>
                    <span>Games: {title.gameCount}</span>
                    <span>Creator: {title.creatorName ?? "Admin seed"}</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {!title.isUniversal && (
                      <Button
                        className="rounded-[1.2rem]"
                        disabled={isPending}
                        onClick={() =>
                          runAction(async () => {
                            await promoteTitleToUniversal({
                              gameTitleId: title.id,
                            });
                          }, "Title promoted to universal")
                        }
                        variant="outline"
                      >
                        <Sparkles className="size-4" />
                        Make universal
                      </Button>
                    )}

                    <div className="flex gap-2">
                      <Select
                        onValueChange={(value) =>
                          setMergeTargets((current) => ({
                            ...current,
                            [title.id]: asSelectValue(value) || "none",
                          }))
                        }
                        value={mergeTargets[title.id] ?? "none"}
                      >
                        <SelectTrigger className="h-12 flex-1 rounded-[1.2rem]">
                          <SelectValue placeholder="Merge into..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Merge into...</SelectItem>
                          {titles
                            .filter((candidate) => candidate.id !== title.id)
                            .map((candidate) => (
                              <SelectItem
                                key={candidate.id}
                                value={candidate.id}
                              >
                                {candidate.title}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        className="rounded-[1.2rem]"
                        disabled={
                          isPending ||
                          !mergeTargets[title.id] ||
                          mergeTargets[title.id] === "none"
                        }
                        onClick={() =>
                          runAction(async () => {
                            await mergeTitleIntoAnother({
                              sourceGameTitleId: title.id,
                              targetGameTitleId: mergeTargets[title.id]!,
                            });
                          }, "Titles merged")
                        }
                        variant="outline"
                      >
                        <GitMerge className="size-4" />
                        Merge
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredTitles.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  No titles matched that search.
                </CardContent>
              </Card>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
