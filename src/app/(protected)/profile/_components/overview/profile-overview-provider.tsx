"use client";

import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import type { ProfileOverviewPageData, ProfileOverviewUser } from "./types";

type ProfileOverviewContextValue = {
  data: ProfileOverviewPageData;
  user: ProfileOverviewUser;
  patchUser: (nextUser: Partial<ProfileOverviewUser>) => void;
};

const ProfileOverviewContext =
  createContext<ProfileOverviewContextValue | null>(null);

export function ProfileOverviewProvider({
  initialData,
  children,
}: PropsWithChildren<{ initialData: ProfileOverviewPageData }>) {
  const [data, setData] = useState(initialData);

  const value: ProfileOverviewContextValue = {
    data,
    user: data.user,
    patchUser(nextUser) {
      setData((current) => ({
        ...current,
        user: {
          ...current.user,
          ...nextUser,
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
