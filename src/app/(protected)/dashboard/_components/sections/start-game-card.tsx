"use client";

import { sectionActionClassName } from "@/components/ui/section-styles";
import { ArrowRight, Dices } from "lucide-react";
import Link from "next/link";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";

export function StartGameCard() {
  return (
    <Link href="/game/create/settings" className="mx-4 -mt-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 p-0 text-[1.05rem] font-extrabold tracking-[-0.015em]">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-600 shadow-[0_1px_0_rgba(255,255,255,0.4)_inset] dark:text-violet-400">
              <Dices className="size-4.5" strokeWidth={2.25} />
            </span>
            <span>Start a new game</span>
          </CardTitle>
          <CardAction>
            <span className={sectionActionClassName}>
              Play
              <ArrowRight />
            </span>
          </CardAction>
        </CardHeader>
      </Card>
    </Link>
  );
}
