import GameTitleDefaultsEditor from "@/components/game/game-title-defaults-editor";
import GameTitleImage from "@/components/game/game-title-image";
import GameTitleImageEditor from "@/components/game/game-title-image-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GameTitleStatsPageData } from "@/lib/db/store/game.store";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Image as ImageIcon,
  Settings2,
} from "lucide-react";
import Link from "next/link";

function formatDate(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminGameTitlePage({
  data,
}: {
  data: GameTitleStatsPageData;
}) {
  const { stats, title } = data;
  const gameHistoryHref = `/game/history?titleId=${encodeURIComponent(title.id)}`;

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-32 lg:px-6 xl:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <Button
              className="w-fit"
              render={<Link href="/admin/titles" />}
              type="button"
              variant="ghost"
            >
              <ArrowLeft className="size-4" />
              Back to titles
            </Button>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <GameTitleImage
                className="h-24 w-24 shrink-0 shadow-sm"
                color={title.color}
                imageUrl={title.imageUrl}
                verticalFocus={title.imageVerticalFocus}
              />
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={title.isUniversal ? "default" : "secondary"}>
                    {title.isUniversal ? "Universal title" : "Personal title"}
                  </Badge>
                  <Badge variant="outline">Admin workspace</Badge>
                </div>
                <div className="space-y-1">
                  <h1 className="text-4xl font-black tracking-tight">
                    {title.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Configure title defaults and admin controls with a wider,
                    desktop-friendly layout.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 xl:justify-end">
            <Button
              render={<Link href={`/titles/${title.id}`} />}
              type="button"
              variant="outline"
            >
              <ExternalLink className="size-4" />
              Player page
            </Button>
            <Button
              render={<Link href={`/game/create/settings?titleId=${title.id}`} />}
              type="button"
            >
              Start a new game
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-black">Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-xl border border-border/70 bg-muted/35 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Games played
                  </p>
                  <p className="mt-2 text-3xl font-black">{stats.totalGames}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/35 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Win rate
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {Math.round(stats.winRate * 100)}%
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/35 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Last played
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatDate(stats.lastPlayedAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/35 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Rounds logged
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {stats.totalRounds}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-black">Quick links</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button
                  className="justify-between"
                  render={<Link href={gameHistoryHref} />}
                  type="button"
                  variant="outline"
                >
                  Full game history
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-black">
                  <ImageIcon className="size-4" />
                  Artwork
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GameTitleImageEditor title={title} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Settings2 className="size-4" />
              Title settings and defaults
            </div>
            <GameTitleDefaultsEditor layout="admin" title={title} />
          </div>
        </div>
      </div>
    </div>
  );
}
