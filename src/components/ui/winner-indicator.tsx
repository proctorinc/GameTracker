import type { ComponentPropsWithoutRef } from "react";
import { Crown } from "lucide-react";

import { cn } from "@/lib/utils";

import { Badge } from "./badge";

type WinnerIndicatorProps = ComponentPropsWithoutRef<"span"> & {
  label?: string;
  size?: "sm" | "md";
  variant?: "badge" | "icon";
};

const iconSizeClassNames = {
  sm: "size-7",
  md: "size-9",
} as const;

const crownSizeClassNames = {
  sm: "size-3.5",
  md: "size-4",
} as const;

export function WinnerIndicator({
  ...props
}: WinnerIndicatorProps) {
  const {
    className,
    label = "Winner",
    size = "sm",
    variant = "badge",
    ...rest
  } = props;

  if (variant === "icon") {
    return (
      <span
        aria-label={label}
        className={cn(
          "winner-icon inline-flex shrink-0 items-center justify-center rounded-full",
          iconSizeClassNames[size],
          className,
        )}
        title={label}
        {...rest}
      >
        <Crown className={cn(crownSizeClassNames[size])} />
      </span>
    );
  }

  return (
    <Badge
      className={cn(
        "winner-badge h-auto shrink-0 rounded-full border px-2.5 py-1 font-semibold shadow-none",
        className,
      )}
      variant="outline"
      {...rest}
    >
      <Crown className={cn(crownSizeClassNames[size])} />
      {label}
    </Badge>
  );
}
