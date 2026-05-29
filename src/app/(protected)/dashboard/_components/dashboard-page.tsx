"use client";

import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import { ActiveGamesSection } from "./sections/active-games-section";
import { CompletedGamesSection } from "./sections/completed-games-section";
import { DashboardHeroSection } from "./sections/dashboard-hero-section";
import { RecentlyPlayedSection } from "./sections/recently-played-section";
import { StartGameCard } from "./sections/start-game-card";
import { DashboardPageProvider } from "./dashboard-page-provider";

function DashboardPageContent() {
  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-24">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <DashboardHeroSection />
        <RecentlyPlayedSection />
        <StartGameCard />
        <ActiveGamesSection />
        <CompletedGamesSection />
      </div>
    </div>
  );
}

export function DashboardPageView({ data }: { data: DashboardPageData }) {
  return (
    <DashboardPageProvider data={data}>
      <DashboardPageContent />
    </DashboardPageProvider>
  );
}
