import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GameTitleImageVariant = "card" | "hero" | "ambient" | "thumbnail";

const VARIANT_STYLES: Record<
  GameTitleImageVariant,
  {
    imageClassName: string;
    lightOverlay: (color: string) => string;
    darkOverlay: (color: string) => string;
    scrimClassName: string;
  }
> = {
  card: {
    imageClassName: "opacity-52",
    lightOverlay: (color) =>
      `linear-gradient(145deg, color-mix(in srgb, ${color} 72%, white 28%) 0%, color-mix(in srgb, ${color} 38%, transparent) 55%, transparent 100%)`,
    darkOverlay: (color) =>
      `linear-gradient(145deg, color-mix(in srgb, ${color} 78%, black 22%) 0%, color-mix(in srgb, ${color} 42%, transparent) 55%, transparent 100%)`,
    scrimClassName:
      "bg-linear-to-t from-white/48 via-white/24 to-transparent dark:from-black/82 dark:via-black/34 dark:to-transparent",
  },
  hero: {
    imageClassName: "opacity-36",
    lightOverlay: (color) =>
      `linear-gradient(145deg, color-mix(in srgb, ${color} 70%, black 30%) 0%, color-mix(in srgb, ${color} 34%, transparent) 58%, transparent 100%)`,
    darkOverlay: (color) =>
      `linear-gradient(145deg, color-mix(in srgb, ${color} 76%, black 24%) 0%, color-mix(in srgb, ${color} 38%, transparent) 58%, transparent 100%)`,
    scrimClassName:
      "bg-gradient-to-tr from-black/80 via-black/30 to-transparent",
  },
  ambient: {
    imageClassName: "scale-105 opacity-55 blur-[3px]",
    lightOverlay: (color) =>
      `linear-gradient(145deg, color-mix(in srgb, ${color} 58%, white 42%) 0%, color-mix(in srgb, ${color} 28%, transparent) 55%, transparent 100%)`,
    darkOverlay: (color) =>
      `linear-gradient(145deg, color-mix(in srgb, ${color} 66%, black 34%) 0%, color-mix(in srgb, ${color} 32%, transparent) 55%, transparent 100%)`,
    scrimClassName: "bg-background/75 dark:bg-background/78",
  },
  thumbnail: {
    imageClassName: "opacity-62",
    lightOverlay: (color) =>
      `linear-gradient(145deg, color-mix(in srgb, ${color} 64%, white 36%) 0%, color-mix(in srgb, ${color} 30%, transparent) 55%, transparent 100%)`,
    darkOverlay: (color) =>
      `linear-gradient(145deg, color-mix(in srgb, ${color} 72%, black 28%) 0%, color-mix(in srgb, ${color} 34%, transparent) 55%, transparent 100%)`,
    scrimClassName:
      "bg-gradient-to-t from-black/70 via-black/10 to-transparent dark:from-black/78 dark:via-black/18 dark:to-transparent",
  },
};

function resolveTitleColor(color: string | null | undefined) {
  return color?.trim() || "#64748b";
}

export default function GameTitleImage({
  imageUrl,
  color,
  className,
  imageClassName,
  contentClassName,
  children,
  variant = "card",
}: {
  imageUrl?: string | null;
  color?: string | null;
  className?: string;
  imageClassName?: string;
  contentClassName?: string;
  children?: ReactNode;
  variant?: GameTitleImageVariant;
}) {
  const resolvedColor = resolveTitleColor(color);
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ backgroundColor: resolvedColor }}
    >
      {imageUrl ? (
        <div
          className={cn(
            "absolute inset-0 bg-cover bg-center",
            styles.imageClassName,
            imageClassName,
          )}
          style={{ backgroundImage: `url("${imageUrl}")` }}
        />
      ) : null}
      <div
        className="absolute inset-0 dark:hidden"
        style={{ background: styles.lightOverlay(resolvedColor) }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{ background: styles.darkOverlay(resolvedColor) }}
      />
      <div className={cn("absolute inset-0", styles.scrimClassName)} />
      {children ? (
        <div className={cn("relative z-10", contentClassName)}>{children}</div>
      ) : null}
    </div>
  );
}
