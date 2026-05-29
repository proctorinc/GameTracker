"use client";

import { sectionActionClassName } from "@/components/ui/section-styles";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useDashboardPage } from "../dashboard-page-provider";

export function RecentlyPlayedSection() {
  const { recentGameTitles } = useDashboardPage();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-lg font-black">Recently played</h2>
        </div>
        <Link href="/titles" className={sectionActionClassName}>
          View all
          <ArrowRight />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto p-2 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {recentGameTitles.map((gameTitle) => (
          <div
            key={`title=${gameTitle.id}`}
            className="relative flex aspect-square h-40 shrink-0 flex-col justify-between overflow-hidden rounded-2xl border shadow-lg"
            style={{ backgroundColor: gameTitle.color }}
          >
            {gameTitle.imageUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-45"
                style={{ backgroundImage: `url("${gameTitle.imageUrl}")` }}
              />
            ) : null}
            <div className="absolute inset-0 bg-linear-to-t from-white/60 via-white/35 dark:from-black/85 dark:via-black/35 to-transparent" />
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
  );
}
