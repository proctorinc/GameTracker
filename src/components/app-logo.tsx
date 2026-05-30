import { APP_NAME } from "@/lib/app-config";
import { cn } from "@/lib/utils";

export default function AppLogo({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-logo text-5xl font-black uppercase tracking-[0.08em] text-foreground sm:text-6xl",
        className,
      )}
    >
      {APP_NAME}
    </span>
  );
}
