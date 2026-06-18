"use client";

import { useEffect, useState } from "react";

type UseRememberedPageTabStateOptions<TTab extends string> = {
  storageKey: string;
  initialValue: TTab;
  validTabs: readonly TTab[];
  preferInitialValue?: boolean;
};

export function useRememberedPageTabState<TTab extends string>({
  storageKey,
  initialValue,
  validTabs,
  preferInitialValue = false,
}: UseRememberedPageTabStateOptions<TTab>) {
  const [activeTab, setActiveTab] = useState<TTab>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    if (preferInitialValue) {
      return initialValue;
    }

    const storedTab = window.localStorage.getItem(storageKey);

    if (storedTab && validTabs.includes(storedTab as TTab)) {
      return storedTab as TTab;
    }

    return initialValue;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, activeTab);
  }, [activeTab, storageKey]);

  return [activeTab, setActiveTab] as const;
}
