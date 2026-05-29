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
    <details className="group rounded-2xl border border-border bg-muted/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Filter games</p>
          <p className="text-xs text-muted-foreground">
            {activeFilterCount > 0
              ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`
              : "Status, title, friend, creator, outcome, and sort"}
          </p>
        </div>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-3 border-t border-border px-4 py-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
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
          <Select
            value={filters.gameTitleId ?? "all"}
            onValueChange={(value) => updateFilter("gameTitleId", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All titles</SelectItem>
              {gameTitles.map((title) => (
                <SelectItem key={title.id} value={title.id}>
                  {title.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>With friend</Label>
          <Select
            value={filters.friendUserId ?? "all"}
            onValueChange={(value) => updateFilter("friendUserId", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anyone</SelectItem>
              {friends.map((friend) => (
                <SelectItem key={friend.id} value={friend.id}>
                  {[friend.firstName, friend.lastName]
                    .filter(Boolean)
                    .join(" ") || "Friend"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Creator</Label>
          <Select
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
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearFilters}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </details>
  );
}
