import { APP_NAME } from "@/lib/app-config";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function AppLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex gap-3 items-center font-logo text-3xl font-black tracking-[0.08em] text-foreground sm:text-6xl",
        className,
      )}
    >
      <Image
        src="/score-loser.png"
        alt={`${APP_NAME} logo`}
        width={120}
        height={120}
        className="size-14 object-contain"
        unoptimized
      />
    </span>
  );
}
