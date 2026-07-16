"use client";

import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";
import { useDashboardPage } from "../dashboard-page-provider";
import { sectionActionClassName } from "@/components/ui/section-styles";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";

export function RewardPacksSection() {
  const { unopenedCardPacks } = useDashboardPage();

  if (unopenedCardPacks.length === 0) return null;

  const totalPacks = unopenedCardPacks.reduce(
    (total, group) => total + group.packCount,
    0,
  );

  return (
    <Link href="/card/pull" className="mx-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 p-0 text-[1.05rem] font-extrabold tracking-[-0.015em]">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-600 shadow-[0_1px_0_rgba(255,255,255,0.4)_inset] dark:text-sky-400">
              <Gift className="size-4.5" strokeWidth={2.25} />
            </span>
            <span>Packs ready to open</span>
          </CardTitle>
          <CardAction>
            <span className={sectionActionClassName}>
              {totalPacks} {totalPacks === 1 ? "pack" : "packs"}
              <ArrowRight />
            </span>
          </CardAction>
        </CardHeader>
      </Card>
    </Link>
  );
}
