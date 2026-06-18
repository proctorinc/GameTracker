"use client";

import { useEffect, useEffectEvent, useTransition } from "react";
import { useRouter } from "next/navigation";

type UsePageAutoRefreshOptions = {
  intervalMs?: number;
};

const DEFAULT_INTERVAL_MS = 30_000;

export function usePageAutoRefresh(options?: UsePageAutoRefreshOptions) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;

  const refreshPage = useEffectEvent(() => {
    if (document.visibilityState !== "visible" || isPending) {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  });

  useEffect(() => {
    function handleVisibilityRefresh() {
      void refreshPage();
    }

    window.addEventListener("focus", handleVisibilityRefresh);
    window.addEventListener("online", handleVisibilityRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.removeEventListener("focus", handleVisibilityRefresh);
      window.removeEventListener("online", handleVisibilityRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [refreshPage]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshPage();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalMs, refreshPage]);
}
