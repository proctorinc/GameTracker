import * as React from "react";

import { Button } from "@/components/ui/button";
import { cardSurfaceStyle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function TabSelector({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="tablist"
      data-slot="tab-selector"
      className={cn(
        "grid gap-2 overflow-hidden rounded-2xl border border-border/80 bg-card p-1 ring-1 ring-inset ring-foreground/10 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_-1px_0_rgba(0,0,0,0.1)_inset,0_12px_30px_-12px_rgba(15,23,42,0.32)]",
        className,
      )}
      style={{ ...cardSurfaceStyle, ...style }}
      {...props}
    />
  );
}

function TabSelectorButton({
  active,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "variant"> & {
  active: boolean;
}) {
  return (
    <Button
      role="tab"
      aria-selected={active}
      data-slot="tab-selector-button"
      variant={active ? "default" : "ghost"}
      size="sm"
      className={cn(
        "rounded-xl [&:not([aria-selected=true])]:hover:bg-muted/60",
        className,
      )}
      {...props}
    />
  );
}

export { TabSelector, TabSelectorButton };
