import { cn } from "@/lib/utils";
import RankToken from "./RankToken";

interface RankChipProps {
  delta: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-xs px-1 py-0.5",
  md: "",
  lg: "text-lg",
};

export default function RankChip({
  delta,
  size = "md",
  className,
}: RankChipProps) {
  return (
    <div
      className={cn(
        "flex gap-1 items-center rounded-full border border-white/25 bg-white/15 text-white shadow-none backdrop-blur-sm transition-colors hover:bg-white/22",
        sizeClasses[size],
        className,
      )}
    >
      {delta} <RankToken size={size} />
    </div>
  );
}
