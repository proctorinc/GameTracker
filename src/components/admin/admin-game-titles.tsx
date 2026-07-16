"use client";

import {
  mergeTitleIntoAnother,
  promoteTitleToUniversal,
} from "@/app/actions/game";
import GameTitleImage from "@/components/game/game-title-image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import type {
  AdminGameTitleEntry,
  AdminGameTitleFilter,
} from "@/lib/db/store/game.store";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  GitMerge,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

function getTitleTypeLabel(title: AdminGameTitleEntry) {
  if (title.isUniversal) {
    return title.createdByUserId ? "Universal" : "Admin seed";
  }

  return title.createdByUserId ? "User custom" : "Personal";
}

function buildPageHref(
  pathname: string,
  searchParams: URLSearchParams,
  nextPage: number,
) {
  const params = new URLSearchParams(searchParams.toString());
  params.set("page", String(nextPage));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function SelectionCard({
  title,
  role,
}: {
  title: AdminGameTitleEntry | null;
  role: "From" | "To";
}) {
  if (!title) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
        {role} title not selected yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-center gap-3">
        <GameTitleImage
          className="h-12 w-12 shrink-0 shadow-sm"
          color={title.color}
          imageUrl={title.imageUrl}
          verticalFocus={title.imageVerticalFocus}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{title.title}</p>
            <Badge variant="outline">{role}</Badge>
            <Badge variant={title.isUniversal ? "default" : "secondary"}>
              {getTitleTypeLabel(title)}
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {title.creatorName ?? "Admin seed"} • {title.ownerCount} owners •{" "}
            {title.gameCount} games
          </p>
        </div>
      </div>
    </div>
  );
}

function PaginationControls({
  currentPage,
  pathname,
  searchParams,
  totalPages,
}: {
  currentPage: number;
  pathname: string;
  searchParams: URLSearchParams;
  totalPages: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      {currentPage > 1 ? (
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          render={
            <Link href={buildPageHref(pathname, searchParams, currentPage - 1)} />
          }
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          disabled
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
      )}
      <p className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </p>
      {currentPage < totalPages ? (
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          render={
            <Link href={buildPageHref(pathname, searchParams, currentPage + 1)} />
          }
        >
          Next
          <ArrowRight className="size-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          disabled
        >
          Next
          <ArrowRight className="size-4" />
        </Button>
      )}
    </div>
  );
}

export default function AdminGameTitles({
  titles,
  counts,
  filter,
  page,
  pageSize,
  totalCount,
  totalPages,
  selectedSourceTitle,
  selectedTargetTitle,
}: {
  titles: AdminGameTitleEntry[];
  counts: {
    all: number;
    universal: number;
    nonUniversal: number;
    userCustom: number;
    adminSeed: number;
  };
  filter: AdminGameTitleFilter;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  selectedSourceTitle: AdminGameTitleEntry | null;
  selectedTargetTitle: AdminGameTitleEntry | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const rawSearchParams = useSearchParams();
  const searchParams = useMemo(
    () => new URLSearchParams(rawSearchParams.toString()),
    [rawSearchParams],
  );
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const filterItems = [
    { value: "user_custom", label: "User custom" },
    { value: "non_universal", label: "Non-universal" },
    { value: "universal", label: "Universal" },
    { value: "admin_seed", label: "Admin seed" },
    { value: "all", label: "All titles" },
  ] as const;

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
        getTitleTypeLabel(title),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query, titles]);

  const mergeStatus = useMemo(() => {
    if (!selectedSourceTitle) {
      return {
        canSubmit: false,
        title: "Choose a source title",
        description: "Pick the title that should be merged away from the filtered list below.",
      };
    }

    if (!selectedTargetTitle) {
      return {
        canSubmit: false,
        title: "Choose a merge target",
        description: "Pick the title that should keep the shared history and ownership records.",
      };
    }

    if (selectedSourceTitle.id === selectedTargetTitle.id) {
      return {
        canSubmit: false,
        title: "Choose two different titles",
        description: "The source and target titles must be different records.",
      };
    }

    return {
      canSubmit: true,
      title: "Ready to merge",
      description:
        "All games and title ownerships from the source will be moved into the target title.",
    };
  }, [selectedSourceTitle, selectedTargetTitle]);

  function updateSearchParams(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(rawSearchParams.toString());
    mutator(params);
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function selectTitle(role: "sourceId" | "targetId", titleId: string) {
    updateSearchParams((params) => {
      params.set(role, titleId);
    });
  }

  function clearSelection(role: "sourceId" | "targetId") {
    updateSearchParams((params) => {
      params.delete(role);
    });
  }

  function runAction(
    action: () => Promise<void>,
    options?: {
      successMessage?: string;
      onSuccess?: () => void;
    },
  ) {
    startTransition(async () => {
      try {
        await action();
        if (options?.successMessage) {
          toast.success(options.successMessage);
        }
        options?.onSuccess?.();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Something went wrong",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">All titles</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-5xl font-black">
            {counts.all}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">User custom</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-5xl font-black">
            {counts.userCustom}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Non-universal</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-5xl font-black">
            {counts.nonUniversal}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Universal</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-5xl font-black">
            {counts.universal}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-black">Merge titles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <SelectionCard title={selectedSourceTitle} role="From" />
                <SelectionCard title={selectedTargetTitle} role="To" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending || !selectedSourceTitle}
                  onClick={() => clearSelection("sourceId")}
                >
                  Clear from
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending || !selectedTargetTitle}
                  onClick={() => clearSelection("targetId")}
                >
                  Clear to
                </Button>
                <Button
                  type="button"
                  disabled={
                    isPending ||
                    !mergeStatus.canSubmit ||
                    !selectedSourceTitle ||
                    !selectedTargetTitle
                  }
	                  onClick={() =>
	                    runAction(
	                      async () => {
	                        if (!selectedSourceTitle || !selectedTargetTitle) {
	                          return;
	                        }

	                        await mergeTitleIntoAnother({
	                          sourceGameTitleId: selectedSourceTitle.id,
	                          targetGameTitleId: selectedTargetTitle.id,
	                        });
	                      },
                      {
                        successMessage: "Titles merged",
                        onSuccess: () =>
                          updateSearchParams((params) => {
                            params.delete("sourceId");
                          }),
                      },
                    )
                  }
                >
                  <GitMerge className="size-4" />
                  Merge from into to
                </Button>
              </div>
            </div>

            <Alert>
              <GitMerge className="size-4" />
              <AlertTitle>{mergeStatus.title}</AlertTitle>
              <AlertDescription>{mergeStatus.description}</AlertDescription>
            </Alert>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Use the buttons on each visible row to mark a title as the source or
            target. The source title is the record that will be merged away.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-lg font-black">
                Review game titles
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Showing {titles.length === 0 ? 0 : (page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, totalCount)} of {totalCount} matching
                titles.
              </p>
            </div>
            <div className="w-full max-w-xs space-y-1.5">
              <p className="text-sm font-medium">Title type</p>
              <Select
                items={filterItems}
                value={filter}
                onValueChange={(value) =>
                  updateSearchParams((params) => {
                    params.set("filter", value as AdminGameTitleFilter);
                    params.set("page", "1");
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_custom">User custom</SelectItem>
                  <SelectItem value="non_universal">Non-universal</SelectItem>
                  <SelectItem value="universal">Universal</SelectItem>
                  <SelectItem value="admin_seed">Admin seed</SelectItem>
                  <SelectItem value="all">All titles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 rounded-xl pl-11"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this page of titles"
              value={query}
            />
          </div>

          <PaginationControls
            currentPage={page}
            pathname={pathname}
            searchParams={searchParams}
            totalPages={totalPages}
          />
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {filteredTitles.map((title) => {
            const isSelectedSource = selectedSourceTitle?.id === title.id;
            const isSelectedTarget = selectedTargetTitle?.id === title.id;

            return (
              <Card
                key={title.id}
                className={cn(
                  "rounded-xl border border-border/80 bg-card/95",
                  (isSelectedSource || isSelectedTarget) &&
                    "ring-2 ring-primary/30",
                )}
              >
                <CardContent className="flex flex-col gap-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <GameTitleImage
                        className="h-14 w-14 shrink-0 shadow-sm"
                        color={title.color}
                        imageUrl={title.imageUrl}
                        verticalFocus={title.imageVerticalFocus}
                      />
                      <div className="min-w-0">
                        <Link
                          className="truncate text-xl font-black hover:underline"
                          href={`/admin/titles/${title.id}`}
                        >
                          {title.title}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          normalized: {title.normalizedTitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {isSelectedSource ? (
                        <Badge variant="outline">From</Badge>
                      ) : null}
                      {isSelectedTarget ? (
                        <Badge variant="outline">To</Badge>
                      ) : null}
                      <Badge variant={title.isUniversal ? "default" : "secondary"}>
                        {getTitleTypeLabel(title)}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>Owners: {title.ownerCount}</span>
                    <span>Games: {title.gameCount}</span>
                    <span>Creator: {title.creatorName ?? "Admin seed"}</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={isSelectedSource ? "default" : "outline"}
                        className="rounded-xl"
                        disabled={isPending}
                        onClick={() => selectTitle("sourceId", title.id)}
                      >
                        Select as from
                      </Button>
                      <Button
                        type="button"
                        variant={isSelectedTarget ? "default" : "outline"}
                        className="rounded-xl"
                        disabled={isPending}
                        onClick={() => selectTitle("targetId", title.id)}
                      >
                        Select as to
                      </Button>

                      {!title.isUniversal ? (
                        <Button
                          className="rounded-xl"
                          disabled={isPending}
                          onClick={() =>
                            runAction(
                              async () => {
                                await promoteTitleToUniversal({
                                  gameTitleId: title.id,
                                });
                              },
                              {
                                successMessage: "Title promoted to universal",
                              },
                            )
                          }
                          variant="outline"
                        >
                          <Sparkles className="size-4" />
                          Make universal
                        </Button>
                      ) : null}

                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredTitles.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {titles.length === 0
                  ? "No titles matched this filter."
                  : "No titles matched that search on this page."}
              </CardContent>
            </Card>
          ) : null}

          <PaginationControls
            currentPage={page}
            pathname={pathname}
            searchParams={searchParams}
            totalPages={totalPages}
          />
        </CardContent>
      </Card>
    </div>
  );
}
