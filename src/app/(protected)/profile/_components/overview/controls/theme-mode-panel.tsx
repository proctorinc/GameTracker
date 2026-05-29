"use client";

import { useSyncExternalStore } from "react";
import { Moon, Repeat2, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeModePanel() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  function handleThemeToggle() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  const activeTheme = mounted ? resolvedTheme : undefined;

  return (
    <button
      type="button"
      className="group rounded-2xl border border-border bg-muted/60"
      onClick={handleThemeToggle}
      disabled={!mounted}
    >
      <span className="flex w-full items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-sm font-black text-background">
            {activeTheme === "dark" ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">
              {activeTheme === "dark" ? "Dark mode" : "Light mode"}
            </p>
          </div>
        </div>
        <Repeat2 className="size-4 text-muted-foreground" />
      </span>
    </button>
  );
}
