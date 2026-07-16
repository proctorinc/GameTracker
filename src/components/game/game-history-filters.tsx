"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { GameHistoryPageData } from "@/app/actions/pages/game-history";
import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type HistoryFilters = GameHistoryPageData["filters"];

export default function GameHistoryFilters({
  filters,
  gameTitles,
  friends,
}: {
  filters: HistoryFilters;
  gameTitles: GameHistoryPageData["gameTitles"];
  friends: GameHistoryPageData["friends"];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusItems = [
    { value: "all", label: "All games" },
    { value: "active", label: "In progress" },
    { value: "completed", label: "Completed" },
  ] as const;
  const gameTitleItems = [
    { value: "all", label: "All titles" },
    ...gameTitles.map((title) => ({
      value: title.id,
      label: title.title,
    })),
  ];
  const friendItems = [
    { value: "all", label: "Anyone" },
    ...friends.map((friend) => ({
      value: friend.id,
      label:
        [friend.firstName, friend.lastName].filter(Boolean).join(" ") ||
        "Friend",
    })),
  ];
  const creatorItems = [
    { value: "all", label: "Anyone" },
    { value: "me", label: "Created by me" },
  ] as const;
  const outcomeItems = [
    { value: "all", label: "Any result" },
    { value: "won", label: "I won" },
  ] as const;
  const sortItems = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
  ] as const;
  const activeFilterCount = [
    filters.status !== "all",
    Boolean(filters.gameTitleId),
    Boolean(filters.friendUserId),
    filters.creator !== "all",
    filters.outcome !== "all",
    filters.sort !== "newest",
  ].filter(Boolean).length;

  function updateFilter(
    key: keyof HistoryFilters extends infer K
      ? K extends string
        ? K
        : never
      : never,
    value: string | null,
  ) {
    if (!value) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (
      value === "all" ||
      value === "newest" ||
      (key === "gameTitleId" && value === "all") ||
      (key === "friendUserId" && value === "all")
    ) {
      params.delete(key === "gameTitleId" ? "titleId" : key);
    } else {
      params.set(key === "gameTitleId" ? "titleId" : key, value);
    }

    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  function clearFilters() {
    router.push(pathname);
  }

  return (
    <details className="group rounded-xl border border-border bg-muted/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Filters</p>
          <p className="text-xs text-muted-foreground">
            {activeFilterCount > 0
              ? `${activeFilterCount} active`
              : "Status, title, friend, creator, outcome, and sort"}
          </p>
        </div>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-3 border-t border-border px-4 py-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            items={statusItems}
            value={filters.status}
            onValueChange={(value) => updateFilter("status", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All games</SelectItem>
              <SelectItem value="active">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Game title</Label>
          <SearchableSelect
            value={filters.gameTitleId ?? "all"}
            onValueChange={(value) => updateFilter("gameTitleId", value)}
            options={gameTitleItems}
            placeholder="All titles"
            searchPlaceholder="Search game titles"
            emptyMessage="No titles match your search."
          />
        </div>

        <div className="space-y-1.5">
          <Label>With friend</Label>
          <SearchableSelect
            value={filters.friendUserId ?? "all"}
            onValueChange={(value) => updateFilter("friendUserId", value)}
            options={friendItems}
            placeholder="Anyone"
            searchPlaceholder="Search friends"
            emptyMessage="No friends match your search."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Creator</Label>
          <Select
            items={creatorItems}
            value={filters.creator}
            onValueChange={(value) => updateFilter("creator", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anyone</SelectItem>
              <SelectItem value="me">Created by me</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Outcome</Label>
          <Select
            items={outcomeItems}
            value={filters.outcome}
            onValueChange={(value) => updateFilter("outcome", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any result</SelectItem>
              <SelectItem value="won">I won</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Sort</Label>
          <div className="flex gap-2">
            <Select
              items={sortItems}
              value={filters.sort}
              onValueChange={(value) => updateFilter("sort", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={clearFilters}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    </details>
  );
}
