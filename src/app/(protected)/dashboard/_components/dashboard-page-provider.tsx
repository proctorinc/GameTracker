"use client";

import { createContext, useContext, type PropsWithChildren } from "react";
import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import { usePageAutoRefresh } from "@/lib/use-page-auto-refresh";

type DashboardPageContextValue = {
  data: DashboardPageData;
  user: DashboardPageData["user"];
  canViewPlayerRank: DashboardPageData["canViewPlayerRank"];
  playerRankTotal: DashboardPageData["playerRankTotal"];
  playerRankPosition: DashboardPageData["playerRankPosition"];
  playerRankWindowLabel: DashboardPageData["playerRankWindowLabel"];
  playerRankGamesCount: DashboardPageData["playerRankGamesCount"];
  topThreeFinishes: DashboardPageData["topThreeFinishes"];
  playerRankRecentChangeSummary: DashboardPageData["playerRankRecentChangeSummary"];
  twoPlayerPrizePool: DashboardPageData["twoPlayerPrizePool"];
  threePlayerPrizePool: DashboardPageData["threePlayerPrizePool"];
  sixPlusPlayerPrizePool: DashboardPageData["sixPlusPlayerPrizePool"];
  recentActiveGames: DashboardPageData["recentActiveGames"];
  recentCompletedGames: DashboardPageData["recentCompletedGames"];
  recentGameTitles: DashboardPageData["recentGameTitles"];
};

const DashboardPageContext =
  createContext<DashboardPageContextValue | null>(null);

export function DashboardPageProvider({
  data,
  children,
}: PropsWithChildren<{ data: DashboardPageData }>) {
  usePageAutoRefresh();

  const value: DashboardPageContextValue = {
    data,
    user: data.user,
    canViewPlayerRank: data.canViewPlayerRank,
    playerRankTotal: data.playerRankTotal,
    playerRankPosition: data.playerRankPosition,
    playerRankWindowLabel: data.playerRankWindowLabel,
    playerRankGamesCount: data.playerRankGamesCount,
    topThreeFinishes: data.topThreeFinishes,
    playerRankRecentChangeSummary: data.playerRankRecentChangeSummary,
    twoPlayerPrizePool: data.twoPlayerPrizePool,
    threePlayerPrizePool: data.threePlayerPrizePool,
    sixPlusPlayerPrizePool: data.sixPlusPlayerPrizePool,
    recentActiveGames: data.recentActiveGames,
    recentCompletedGames: data.recentCompletedGames,
    recentGameTitles: data.recentGameTitles,
  };

  return (
    <DashboardPageContext.Provider value={value}>
      {children}
    </DashboardPageContext.Provider>
  );
}

export function useDashboardPage() {
  const context = useContext(DashboardPageContext);

  if (!context) {
    throw new Error(
      "useDashboardPage must be used within a DashboardPageProvider",
    );
  }

  return context;
}
