"use client";

import { useState } from "react";
import {
  ArrowRight,
  Crown,
  MessageCircleMore,
  Swords,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ShowcaseMode = {
  id: string;
  label: string;
  title: string;
  description: string;
  scoreLine: string;
  loser: string;
  winner: string;
  friendNote: string;
  stats: Array<{
    label: string;
    value: string;
  }>;
};

const showcaseModes: ShowcaseMode[] = [
  {
    id: "rematch",
    label: "Rematch",
    title: "One game becomes three more",
    description: "Keep the night moving without losing the score.",
    scoreLine: "Eli 42 • Jules 38 • Sam 55 • Nora 61",
    loser: "Nora",
    winner: "Jules",
    friendNote: "No score disputes.",
    stats: [
      { label: "Rounds", value: "8" },
      { label: "Restart", value: "18 sec" },
    ],
  },
  {
    id: "rivalry",
    label: "Rivalry",
    title: "Keep the receipts",
    description: "Wins, losses, and who talks the most.",
    scoreLine: "Mina 121 • Theo 118 • Aria 109 • Dev 133",
    loser: "Dev",
    winner: "Aria",
    friendNote: "Bragging rights saved.",
    stats: [
      { label: "Games", value: "24" },
      { label: "Top rival", value: "Theo" },
    ],
  },
  {
    id: "party",
    label: "Party",
    title: "More players, one scoreboard",
    description: "Add people and keep it clean.",
    scoreLine: "Bea 16 • Iggy 11 • Cam 20 • Liv 14 • Oz 22",
    loser: "Oz",
    winner: "Iggy",
    friendNote: "One clean scoreboard.",
    stats: [
      { label: "Players", value: "5" },
      { label: "Disputes", value: "0" },
    ],
  },
];

export function LandingPageShowcase() {
  const [activeMode, setActiveMode] = useState<ShowcaseMode>(showcaseModes[0]);

  return (
    <section className="grid gap-4">
      <Card className="rounded-xl border-border/80 bg-card px-0 py-0 shadow-xl">
        <div className="flex h-full flex-col gap-5 p-5">
          <div className="flex flex-wrap gap-2">
            {showcaseModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActiveMode(mode)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                  activeMode.id === mode.id
                    ? "border-transparent bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Preview
              </Badge>
              <h2 className="text-3xl font-black tracking-tight text-balance">
                {activeMode.title}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {activeMode.description}
              </p>
            </div>

            <div className="relative">
              <div className="absolute right-3 top-3 rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-semibold">
                Don&apos;t be a ScoreLoser
              </div>

              <Card className="relative min-h-full rounded-xl border-border/70 bg-background py-0 shadow-none">
                <div className="border-b border-border/70 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Tonight&apos;s scorecard
                      </p>
                      <p className="mt-1 text-lg font-black">Friends only</p>
                    </div>
                    <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
                      <Users className="size-5" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 px-5 py-5">
                  <div className="rounded-xl border border-border/70 bg-muted/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Current table
                        </p>
                        <p className="mt-2 text-sm font-bold leading-6">
                          {activeMode.scoreLine}
                        </p>
                      </div>
                      <Users className="size-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="winner-surface rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] winner-muted">
                            ScoreLoser alert
                          </p>
                          <p className="mt-2 text-2xl font-black">
                            {activeMode.loser} has the score to beat
                          </p>
                          <p className="mt-2 text-sm winner-muted">
                            Time for the rematch.
                          </p>
                        </div>
                        <div className="winner-icon flex size-12 items-center justify-center rounded-xl">
                          <Swords className="size-5" />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <Card className="gap-2 rounded-xl border-border/70 bg-background/85 py-3 shadow-none">
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Crown className="size-4" />
                            <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                              Best round
                            </span>
                          </div>
                          <p className="text-base font-black">
                            {activeMode.winner} made the comeback move
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="gap-2 rounded-xl border-border/70 bg-background/85 py-3 shadow-none">
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MessageCircleMore className="size-4" />
                            <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                              Group chat
                            </span>
                          </div>
                          <p className="text-base font-black">
                            {activeMode.friendNote}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {activeMode.stats.map((stat) => (
                <Card
                  key={stat.label}
                  className="gap-2 rounded-xl border-border/70 bg-background py-3 shadow-none"
                  size="sm"
                >
                  <CardContent className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-lg font-black">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-3">
              <Button render={<Link href="/sign-up" />}>
                Start with friends
                <ArrowRight />
              </Button>
              <Button variant="outline" render={<Link href="/dashboard" />}>
                See the app
              </Button>
            </div>
            </div>
          </div>
      </Card>
    </section>
  );
}
