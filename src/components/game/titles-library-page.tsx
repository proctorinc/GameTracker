import type { TitlesPageData } from "@/app/actions/pages/titles";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import TitlesLibraryFilters from "./titles-library-filters";

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
  const { gameTitles, filters } = data;

  return (
    <div className="min-h-screen px-4 pb-24">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
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
            <TitlesLibraryFilters filters={filters} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-black">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{gameTitles.length} titles</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {gameTitles.map((title) => (
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
                <div className="absolute inset-0 bg-linear-to-t from-white/60 via-white/35 dark:from-black/80 dark:via-black/35 to-transparent" />
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

            {gameTitles.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-muted/35 p-10 text-center text-sm text-muted-foreground">
                No titles matched these filters yet.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
