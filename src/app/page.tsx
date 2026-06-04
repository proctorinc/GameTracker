import { ArrowRight, Receipt, Users } from "lucide-react";
import Link from "next/link";

import AppLogo from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LandingHeroCarousel } from "./_components/landing-hero-carousel";

const featureCards = [
  {
    icon: Users,
    eyebrow: "Friends",
    title: "Bring in your friends",
    description: "Start games with the people you actually play with.",
  },
  {
    icon: Receipt,
    eyebrow: "Results",
    title: "Track every round",
    description: "Scores, winners, losers, and the rematch.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(241,245,249,0.82)_40%,transparent_72%)] dark:bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.08),transparent_56%)]" />

      <div className="relative mx-auto flex w-full max-w-md flex-col gap-6 pb-16">
        <LandingHeroCarousel />

        <section className="grid gap-5 mx-4">
          <div className="space-y-6">
            <div className="flex gap-3">
              <AppLogo size="lg" />
              <h1 className="text-4xl font-black tracking-tight text-balance">
                Don&apos;t be a <span className="text-4xl">Score Loser</span>
              </h1>
            </div>
            <p className="max-w-sm text-base leading-7 text-muted-foreground">
              For friend groups, game nights, and keeping score straight.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button render={<Link href="/sign-up" />}>
                Start a game night
                <ArrowRight />
              </Button>
              <Button variant="outline" render={<Link href="/sign-in" />}>
                Sign in
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {featureCards.map(
                ({ icon: Icon, eyebrow, title, description }) => (
                  <Card
                    key={title}
                    className="rounded-[1.8rem] border-border/80 bg-card shadow-lg"
                  >
                    <CardContent className="space-y-3 pt-1">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {eyebrow}
                        </p>
                        <p className="mt-2 text-lg font-black">{title}</p>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {description}
                      </p>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          </div>
        </section>

        {/*<LandingPageShowcase />*/}

        <Card className="rounded-[2rem] border-border/80 bg-foreground py-0 text-background shadow-lg mx-4">
          <CardContent className="space-y-2 py-6">
            <p className="font-semibold">And remember,</p>
            <p className="text-3xl font-black tracking-tight text-balance">
              Don&apos;t be a ScoreLoser
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
