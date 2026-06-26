import { cn } from "@/lib/utils";
import RankToken from "./RankToken";

interface RankChipProps {
  delta: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: "positive" | "negative" | "neutral";
}

const sizeClasses = {
  sm: "px-1 py-0.5 text-xs",
  md: "px-2 py-1 text-[0.68rem]",
  lg: "px-2.5 py-1 text-sm",
};

const toneClasses = {
  positive:
    "border-border/70 bg-background/90 text-foreground shadow-sm hover:bg-background dark:border-white/25 dark:bg-white/15 dark:text-white dark:shadow-none dark:hover:bg-white/22",
  negative:
    "border-rose-500/30 bg-rose-500/12 text-rose-700 shadow-sm hover:bg-rose-500/16 dark:border-rose-400/30 dark:bg-rose-400/12 dark:text-rose-200 dark:shadow-none dark:hover:bg-rose-400/18",
  neutral:
    "border-border/70 bg-muted/70 text-foreground shadow-sm hover:bg-muted dark:border-white/20 dark:bg-white/12 dark:text-white dark:shadow-none dark:hover:bg-white/18",
};

export default function RankChip({
  delta,
  size = "md",
  tone = "positive",
  className,
}: RankChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-[0.14em] backdrop-blur-sm transition-colors",
        toneClasses[tone],
        sizeClasses[size],
        className,
      )}
    >
      <span>{delta}</span>
      <RankToken size={size} />
    </span>
  );
}
