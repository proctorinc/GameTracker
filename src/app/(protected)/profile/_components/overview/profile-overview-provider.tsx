"use client";

import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import { usePageAutoRefresh } from "@/lib/use-page-auto-refresh";
import { useRememberedPageTabState } from "@/lib/use-remembered-page-tab-state";
import type {
  ProfileOverviewPageData,
  ProfileOverviewTab,
  ProfileOverviewUser,
} from "./types";

const PROFILE_TAB_STORAGE_KEY = "page-tab:/profile";
const PROFILE_TABS = ["stats", "friends", "collection", "settings"] as const;

function normalizeStoredProfileTab(tab: ProfileOverviewTab): ProfileOverviewTab {
  return tab === "settings" ? "stats" : tab;
}

type ProfileOverviewContextValue = {
  data: ProfileOverviewPageData;
  user: ProfileOverviewUser;
  activeTab: ProfileOverviewTab;
  setActiveTab: (tab: ProfileOverviewTab) => void;
  patchUser: (nextUser: Partial<ProfileOverviewUser>) => void;
};

const ProfileOverviewContext =
  createContext<ProfileOverviewContextValue | null>(null);

function formatDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
}) {
  return [input.firstName, input.lastName].filter(Boolean).join(" ").trim() || "Your profile";
}

export function ProfileOverviewProvider({
  initialData,
  children,
}: PropsWithChildren<{ initialData: ProfileOverviewPageData }>) {
  usePageAutoRefresh();

  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] =
    useRememberedPageTabState<ProfileOverviewTab>({
      storageKey: PROFILE_TAB_STORAGE_KEY,
      initialValue: initialData.initialTab,
      validTabs: PROFILE_TABS,
      normalizeStoredTab: normalizeStoredProfileTab,
      preferInitialValue:
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).has("tab"),
    });

  const value: ProfileOverviewContextValue = {
    data,
    user: data.user,
    activeTab,
    setActiveTab,
    patchUser(nextUser) {
      setData((current) => ({
        ...current,
        user: {
          ...current.user,
          ...nextUser,
        },
        profile: {
          ...current.profile,
          firstName: nextUser.firstName ?? current.profile.firstName,
          lastName: nextUser.lastName ?? current.profile.lastName,
          color: nextUser.color ?? current.profile.color,
          avatarUrl: nextUser.avatarUrl ?? current.profile.avatarUrl,
          displayName: formatDisplayName({
            firstName: nextUser.firstName ?? current.profile.firstName,
            lastName: nextUser.lastName ?? current.profile.lastName,
          }),
        },
      }));
    },
  };

  return (
    <ProfileOverviewContext.Provider value={value}>
      {children}
    </ProfileOverviewContext.Provider>
  );
}

export function useProfileOverview() {
  const context = useContext(ProfileOverviewContext);

  if (!context) {
    throw new Error(
      "useProfileOverview must be used within a ProfileOverviewProvider",
    );
  }

  return context;
}
