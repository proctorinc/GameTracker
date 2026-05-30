"use client";

import { sectionActionClassName } from "@/components/ui/section-styles";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";

export function StartGameCard() {
  return (
    <Link href="/game/create/settings">
      <Card>
        <CardHeader>
          <CardTitle>Start a new game</CardTitle>
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
