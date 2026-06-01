"use client";

import { sectionActionClassName } from "@/components/ui/section-styles";
import { ArrowRight, Dices } from "lucide-react";
import Link from "next/link";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";

export function StartGameCard() {
  return (
    <Link href="/game/create/settings" className="mx-4 -mt-4">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="flex gap-1.5 items-center">
            <Dices />
            New game
          </CardTitle>
          <CardAction>
            <span className={sectionActionClassName}>
              Start
              <ArrowRight />
            </span>
          </CardAction>
        </CardHeader>
      </Card>
    </Link>
  );
}
