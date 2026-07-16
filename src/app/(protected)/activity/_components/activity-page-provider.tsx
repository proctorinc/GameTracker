"use client";

import { createContext, useContext, useState, type PropsWithChildren } from "react";
import { usePageAutoRefresh } from "@/lib/use-page-auto-refresh";
import { useRememberedPageTabState } from "@/lib/use-remembered-page-tab-state";
import type { ActivityPageData } from "./page-data";

type ActivityTabKey = "activity" | "leaderboard";

const ACTIVITY_TAB_STORAGE_KEY = "page-tab:/activity";
const ACTIVITY_TABS = ["activity", "leaderboard"] as const;

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
  initialTab,
  children,
}: PropsWithChildren<{ data: ActivityPageData; initialTab: ActivityTabKey }>) {
  usePageAutoRefresh();

  const [activeTab, setActiveTab] = useRememberedPageTabState<ActivityTabKey>({
    storageKey: ACTIVITY_TAB_STORAGE_KEY,
    initialValue: initialTab,
    validTabs: ACTIVITY_TABS,
    preferInitialValue:
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("tab"),
  });
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
