"use client";

import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import { ActiveGamesSection } from "./sections/active-games-section";
import { CompletedGamesSection } from "./sections/completed-games-section";
import { DashboardHeroSection } from "./sections/dashboard-hero-section";
import { EmptyDashboardStateSection } from "./sections/empty-dashboard-state-section";
import { IncomingInvitationsCard } from "./sections/incoming-invitations-card";
import { RecentlyPlayedSection } from "./sections/recently-played-section";
import { StartGameCard } from "./sections/start-game-card";
import {
  DashboardPageProvider,
  useDashboardPage,
} from "./dashboard-page-provider";

function DashboardPageContent() {
  const {
    incomingInvitations,
    recentActiveGames,
    recentCompletedGames,
    recentGameTitles,
  } = useDashboardPage();
  const isFirstRunDashboard =
    incomingInvitations.length === 0 &&
    recentActiveGames.length === 0 &&
    recentCompletedGames.length === 0 &&
    recentGameTitles.length === 0;

  return (
    <div
      className={
        isFirstRunDashboard
          ? "min-h-screen px-4 py-6"
          : "min-h-screen overflow-y-auto pb-40"
      }
    >
      <div
        className={
          isFirstRunDashboard
            ? "mx-auto flex min-h-[calc(80dvh-3rem)] w-full max-w-md flex-col justify-center"
            : "mx-auto flex w-full max-w-md flex-col gap-6"
        }
      >
        {isFirstRunDashboard ? (
          <EmptyDashboardStateSection />
        ) : (
          <>
            <DashboardHeroSection />
            <RecentlyPlayedSection />
            <StartGameCard />
            <IncomingInvitationsCard />
            <ActiveGamesSection />
            <CompletedGamesSection />
          </>
        )}
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
