"use client";

import type { TitlesPageData } from "@/app/actions/pages/titles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronDown } from "lucide-react";

type TitleFilters = TitlesPageData["filters"];

export default function TitlesLibraryFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: {
  filters: TitleFilters;
  onFiltersChange: (nextFilters: Partial<TitleFilters>) => void;
  onClearFilters: () => void;
}) {
  const scopeItems = [
    { value: "all", label: "All titles" },
    { value: "mine", label: "My titles" },
    { value: "universal", label: "Universal titles" },
  ] as const;
  const sourceItems = [
    { value: "all", label: "Any source" },
    { value: "universal", label: "Universal" },
    { value: "created", label: "Created" },
    { value: "played", label: "Played" },
    { value: "shared", label: "Shared" },
    { value: "merged", label: "Merged" },
    { value: "admin_seed", label: "Admin seed" },
  ] as const;
  const sortItems = [
    { value: "title-asc", label: "Title A-Z" },
    { value: "title-desc", label: "Title Z-A" },
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
  ] as const;
  const activeFilterCount = [
    filters.scope !== "all",
    filters.source !== "all",
    filters.sort !== "title-asc",
    Boolean(filters.query),
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-12 rounded-[1.2rem] pl-11"
          name="query"
          onChange={(event) =>
            onFiltersChange({
              query: event.target.value,
            })
          }
          placeholder="Search titles by name"
          value={filters.query}
        />
      </div>

      <details className="group rounded-2xl border border-border bg-muted/60">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Filter titles</p>
            <p className="text-xs text-muted-foreground">
              {activeFilterCount > 0
                ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`
                : "Scope, source, and sort"}
            </p>
          </div>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-3 border-t border-border px-4 py-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Scope</Label>
            <Select
              items={scopeItems}
              value={filters.scope}
              onValueChange={(value) =>
                onFiltersChange({
                  scope: value as TitleFilters["scope"],
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All titles</SelectItem>
                <SelectItem value="mine">My titles</SelectItem>
                <SelectItem value="universal">Universal titles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select
              items={sourceItems}
              value={filters.source}
              onValueChange={(value) =>
                onFiltersChange({
                  source: value as TitleFilters["source"],
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any source</SelectItem>
                <SelectItem value="universal">Universal</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="played">Played</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
                <SelectItem value="merged">Merged</SelectItem>
                <SelectItem value="admin_seed">Admin seed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Sort</Label>
            <div className="flex gap-2">
              <Select
                items={sortItems}
                value={filters.sort}
                onValueChange={(value) =>
                  onFiltersChange({
                    sort: value as TitleFilters["sort"],
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title-asc">Title A-Z</SelectItem>
                  <SelectItem value="title-desc">Title Z-A</SelectItem>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={onClearFilters}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
