"use client";

import { createContext, useContext, useState, type PropsWithChildren } from "react";
import { usePageAutoRefresh } from "@/lib/use-page-auto-refresh";
import type { ActivityPageData } from "./page-data";

type ActivityTabKey = "activity" | "leaderboard";

type ActivityPageContextValue = {
  data: ActivityPageData;
  activeTab: ActivityTabKey;
  setActiveTab: (tab: ActivityTabKey) => void;
  expandedFriendId: string | null;
  toggleExpandedFriendId: (friendId: string) => void;
};

const ActivityPageContext = createContext<ActivityPageContextValue | null>(null);

export function ActivityPageProvider({
  data,
  children,
}: PropsWithChildren<{ data: ActivityPageData }>) {
  usePageAutoRefresh();

  const [activeTab, setActiveTab] = useState<ActivityTabKey>("activity");
  const [expandedFriendId, setExpandedFriendId] = useState<string | null>(null);

  return (
    <ActivityPageContext.Provider
      value={{
        data,
        activeTab,
        setActiveTab,
        expandedFriendId,
        toggleExpandedFriendId(friendId) {
          setExpandedFriendId((current) => (current === friendId ? null : friendId));
        },
      }}
    >
      {children}
    </ActivityPageContext.Provider>
  );
}

export function useActivityPage() {
  const context = useContext(ActivityPageContext);

  if (!context) {
    throw new Error("useActivityPage must be used within an ActivityPageProvider");
  }

  return context;
}
