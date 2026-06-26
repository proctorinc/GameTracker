"use client";

import GameTitleImage from "@/components/game/game-title-image";
import { sectionActionClassName } from "@/components/ui/section-styles";
import { CardContent, CardEmpty } from "@/components/ui/card";
import { ArrowRight, ChartSpline, Dice6, Dices } from "lucide-react";
import Link from "next/link";
import { useDashboardPage } from "../dashboard-page-provider";
import { cn } from "@/lib/utils";

export function RecentlyPlayedSection() {
  const { recentGameTitles } = useDashboardPage();

  return (
    <div className="flex flex-col gap-4 w-full overflow-y-visible">
      <CardContent className="overflow-visible px-0">
        {recentGameTitles.length === 0 ? (
          <CardEmpty className="flex flex-col items-center gap-3">
            <p>No recent titles yet.</p>
            <Link
              href="/game/create/settings"
              className={sectionActionClassName}
            >
              Start a game
              <ArrowRight />
            </Link>
          </CardEmpty>
        ) : (
          <div className="overflow-visible">
            <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden  pb-4">
              {recentGameTitles.map((gameTitle) => (
                <GameTitleImage
                  key={`title=${gameTitle.id}`}
                  className={cn(
                    "flex aspect-[4/5] h-[30vh] shrink-0 flex-col justify-between rounded-2xl border border-border/70 shadow-lg",
                  )}
                  color={gameTitle.color}
                  contentClassName="h-full"
                  imageUrl={gameTitle.imageUrl}
                >
                  <div className="flex h-full flex-col p-3 text-white">
                    <p className="text-lg font-black drop-shadow-sm">
                      {gameTitle.title}
                    </p>
                    <div className="mt-auto flex gap-2">
                      <Link
                        href={`/titles/${gameTitle.id}`}
                        className="rounded-full flex gap-1 items-center border border-white/25 bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur-sm transition-opacity hover:opacity-90"
                      >
                        <ChartSpline className="size-4" />
                        Stats
                      </Link>
                      <Link
                        href={`/game/create/settings?titleId=${gameTitle.id}`}
                        className="rounded-full flex gap-1 items-center bg-white px-3 py-1 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
                      >
                        <Dices className="size-4" />
                        Play
                      </Link>
                    </div>
                  </div>
                </GameTitleImage>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}
