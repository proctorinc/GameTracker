import { cn } from "@/lib/utils";
import Image from "next/image";

interface RankTokenProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-4 h-4 text-sm",
  md: "w-6 h-6 text-xl",
  lg: "w-8 h-8 text-3xl",
};

export default function RankToken({ className, size = "md" }: RankTokenProps) {
  const avatar = (
    <div
      className={cn(
        "relative isolate shrink-0 select-none overflow-hidden rounded-full flex items-center justify-center",
        sizeClasses[size],
        className,
      )}
    >
      <Image alt="SL" src="/rank-cred.png" width={100} height={100} />
    </div>
  );

  return avatar;
}
