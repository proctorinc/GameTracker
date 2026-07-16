import { CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type GameSectionHeaderProps = {
  action: ReactNode;
  icon: LucideIcon;
  title: string;
  variant: "active" | "recent";
};

const variantStyles = {
  active: {
    icon: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  recent: {
    icon: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
} as const;

export function GameSectionHeader({
  action,
  icon: Icon,
  title,
  variant,
}: GameSectionHeaderProps) {
  const styles = variantStyles[variant];

  return (
    <CardHeader className="relative items-start gap-x-3 pb-4">
      <div className="relative z-10 flex min-w-0 translate-y-1.5 items-center gap-3">
        <div
          className={cn(
            "relative grid size-9 shrink-0 place-items-center rounded-xl border shadow-[0_1px_0_rgba(255,255,255,0.4)_inset]",
            styles.icon,
          )}
        >
          <Icon className="size-4.5" strokeWidth={2.25} />
        </div>
        <CardTitle className="truncate p-0 text-[1.05rem] font-extrabold tracking-[-0.015em]">
          {title}
        </CardTitle>
      </div>

      <CardAction className="relative z-10 translate-y-4 self-start">
        {action}
      </CardAction>

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-11 w-full overflow-visible text-border/80"
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 400 44"
      >
        <path
          d="M 0 43 H 248 C 254 43 257 41 261 37 L 292 6 C 296 2 299 1 305 1 H 400"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </CardHeader>
  );
}
