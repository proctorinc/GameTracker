"use client";

import { sectionActionClassName } from "@/components/ui/section-styles";
import { CardContent, CardEmpty } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
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
                <div
                  key={`title=${gameTitle.id}`}
                  className={cn(
                    "relative flex aspect-[4/5] h-[30vh] shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-none shadow-lg",
                  )}
                  style={{ backgroundColor: gameTitle.color }}
                >
                  {gameTitle.imageUrl ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-45"
                      style={{
                        backgroundImage: `url("${gameTitle.imageUrl}")`,
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-linear-to-t from-white/45 via-white/25 dark:from-black/85 dark:via-black/35 to-transparent" />
                  <div className="relative z-10 flex h-full flex-col justify-between p-3 text-white">
                    <p className="text-lg font-black drop-shadow-sm">
                      {gameTitle.title}
                    </p>
                    <div className="flex gap-2">
                      <Link
                        href={`/titles/${gameTitle.id}`}
                        className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur-sm transition-opacity hover:opacity-90"
                      >
                        History
                      </Link>
                      <Link
                        href={`/game/create/settings?titleId=${gameTitle.id}`}
                        className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
                      >
                        Play
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}
