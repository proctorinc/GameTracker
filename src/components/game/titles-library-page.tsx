"use client";

import type { TitlesPageData } from "@/app/actions/pages/titles";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardEmpty,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TitlesLibraryFilters from "./titles-library-filters";

const DEFAULT_FILTERS: TitlesPageData["filters"] = {
  scope: "all",
  source: "all",
  sort: "title-asc",
  query: "",
};

function getSourceLabel(
  source: TitlesPageData["gameTitles"][number]["accessSource"],
) {
  switch (source) {
    case "admin_seed":
      return "Admin";
    case "created":
      return "Created";
    case "merged":
      return "Merged";
    case "played":
      return "Played";
    case "shared":
      return "Shared";
    case "universal":
      return "Universal";
    default:
      return "Saved";
  }
}

export default function TitlesLibraryPage({ data }: { data: TitlesPageData }) {
  const { gameTitles, filters: initialFilters } = data;
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.scope !== "all") {
      params.set("scope", filters.scope);
    }

    if (filters.source !== "all") {
      params.set("source", filters.source);
    }

    if (filters.sort !== "title-asc") {
      params.set("sort", filters.sort);
    }

    if (filters.query.trim()) {
      params.set("query", filters.query);
    }

    const nextUrl = params.size ? `/titles?${params.toString()}` : "/titles";
    window.history.replaceState(null, "", nextUrl);
  }, [filters]);

  const visibleTitles = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase();

    return [...gameTitles]
      .filter((title) => {
        if (filters.scope === "mine" && !title.isOwned) {
          return false;
        }

        if (filters.scope === "universal" && !title.isUniversal) {
          return false;
        }

        if (filters.source !== "all" && title.accessSource !== filters.source) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [title.title, title.normalizedTitle].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
      })
      .sort((left, right) => {
        switch (filters.sort) {
          case "title-desc":
            return right.title.localeCompare(left.title);
          case "newest":
            return right.createdAt.localeCompare(left.createdAt);
          case "oldest":
            return left.createdAt.localeCompare(right.createdAt);
          case "title-asc":
          default:
            return left.title.localeCompare(right.title);
        }
      });
  }, [filters, gameTitles]);

  return (
    <div className="min-h-screen px-4 pb-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight">
            All game titles
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-black">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <TitlesLibraryFilters
              filters={filters}
              onClearFilters={() => setFilters(DEFAULT_FILTERS)}
              onFiltersChange={(nextFilters) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  ...nextFilters,
                }))
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-black">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{visibleTitles.length} titles</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleTitles.map((title) => (
              <div
                key={title.id}
                className="relative flex min-h-40 flex-col justify-between overflow-hidden rounded-3xl p-4 text-left shadow-sm"
                style={{ backgroundColor: title.color }}
              >
                {title.imageUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-45"
                    style={{ backgroundImage: `url("${title.imageUrl}")` }}
                  />
                ) : null}
                <div className="absolute inset-0 bg-linear-to-t from-white/45 via-white/25 dark:from-black/80 dark:via-black/35 to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      className={cn(
                        "border-white/25 bg-white/15 text-white backdrop-blur-sm",
                        title.isUniversal ? "" : "bg-black/15",
                      )}
                      variant="outline"
                    >
                      {title.isUniversal ? "Universal" : "Personal"}
                    </Badge>
                    <Badge
                      className="border-white/25 bg-white/15 text-white backdrop-blur-sm"
                      variant="outline"
                    >
                      {getSourceLabel(title.accessSource)}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-2xl font-black text-white drop-shadow-sm">
                        {title.title}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/titles/${title.id}`}
                        className="inline-flex h-7 items-center justify-center rounded-full bg-white px-2.5 text-[0.8rem] font-medium text-slate-950 transition-colors hover:bg-white/90"
                      >
                        History
                      </Link>
                      <Link
                        href={`/game/create/settings?titleId=${title.id}`}
                        className="inline-flex h-7 items-center justify-center gap-1 rounded-full border border-white/25 bg-white/15 px-2.5 text-[0.8rem] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                      >
                        Play
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {visibleTitles.length === 0 ? (
              <CardEmpty className="col-span-full flex flex-col items-center gap-3 p-10">
                <p>No titles matched these filters yet.</p>
                <Link
                  href="/game/create/settings"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Start a game
                  <ArrowRight className="size-4" />
                </Link>
              </CardEmpty>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
