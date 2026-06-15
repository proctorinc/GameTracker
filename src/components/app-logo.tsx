import { cva, type VariantProps } from "class-variance-authority";
import { APP_NAME } from "@/lib/app-config";
import { cn } from "@/lib/utils";
import Image from "next/image";

const appLogoVariants = cva(
  "flex items-center gap-3 font-logo font-black tracking-[0.08em] text-foreground",
  {
    variants: {
      size: {
        sm: "text-2xl sm:text-4xl",
        default: "text-3xl sm:text-6xl",
        lg: "text-4xl sm:text-7xl",
        xl: "text-5xl sm:text-8xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const appLogoImageVariants = cva("object-contain", {
  variants: {
    size: {
      sm: "size-10",
      default: "size-14",
      lg: "size-16 sm:size-20",
      xl: "size-30 sm:size-30",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

type AppLogoProps = {
  className?: string;
} & VariantProps<typeof appLogoVariants>;

export default function AppLogo({ className, size }: AppLogoProps) {
  return (
    <span className={cn(appLogoVariants({ size }), className)}>
      <Image
        src="/score-loser.png"
        alt={`${APP_NAME} logo`}
        width={120}
        height={120}
        className={appLogoImageVariants({ size })}
        unoptimized
      />
    </span>
  );
}
