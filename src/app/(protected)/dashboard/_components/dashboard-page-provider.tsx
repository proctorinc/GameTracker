"use client";

import {
  createContext,
  useContext,
  useTransition,
  type PropsWithChildren,
} from "react";
import { useRouter } from "next/navigation";
import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import { acceptInvitation, declineInvitation } from "@/app/actions/friends";
import { usePageAutoRefresh } from "@/lib/use-page-auto-refresh";
import { toast } from "sonner";

type DashboardPageContextValue = {
  data: DashboardPageData;
  user: DashboardPageData["user"];
  incomingInvitations: DashboardPageData["incomingInvitations"];
  isPending: boolean;
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
  unopenedCardPacks: DashboardPageData["unopenedCardPacks"];
  handleAcceptInvitation: (invitationId: string) => void;
  handleDeclineInvitation: (invitationId: string) => void;
};

const DashboardPageContext =
  createContext<DashboardPageContextValue | null>(null);

export function DashboardPageProvider({
  data,
  children,
}: PropsWithChildren<{ data: DashboardPageData }>) {
  usePageAutoRefresh();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleInvitationAction(
    action: (formData: FormData) => Promise<unknown>,
    invitationId: string,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
  ) {
    const formData = new FormData();
    formData.set("invitationId", invitationId);

    startTransition(async () => {
      const loadingId = toast.loading(messages.loading);

      try {
        await action(formData);
        toast.dismiss(loadingId);
        router.refresh();
        toast.success(messages.success);
      } catch (error) {
        toast.dismiss(loadingId);
        toast.error(error instanceof Error ? error.message : messages.error);
      }
    });
  }

  const value: DashboardPageContextValue = {
    data,
    user: data.user,
    incomingInvitations: data.incomingInvitations,
    isPending,
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
    unopenedCardPacks: data.unopenedCardPacks,
    handleAcceptInvitation(invitationId) {
      handleInvitationAction(acceptInvitation, invitationId, {
        loading: "Accepting invitation...",
        success: "Invitation accepted",
        error: "Failed to accept invitation",
      });
    },
    handleDeclineInvitation(invitationId) {
      handleInvitationAction(declineInvitation, invitationId, {
        loading: "Declining invitation...",
        success: "Invitation declined",
        error: "Failed to decline invitation",
      });
    },
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
