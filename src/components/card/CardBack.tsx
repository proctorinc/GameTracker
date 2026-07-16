import type { CSSProperties } from "react";
import type { DeckBackStyle } from "@/lib/db/schema";
import { DEFAULT_DECK_BACK } from "@/lib/card-deck-style";
import { cn } from "@/lib/utils";

export type CardBackProps = {
  className?: string;
  label?: string;
  backStyle?: DeckBackStyle;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
};

function pattern(style: DeckBackStyle, primary: string, secondary: string, accent: string): CSSProperties {
  if (style === "sunburst") {
    return {
      backgroundColor: secondary,
      backgroundImage: `repeating-conic-gradient(from 12deg at 50% 50%, ${primary} 0deg 14deg, ${secondary} 14deg 28deg)`,
      color: accent,
    };
  }

  if (style === "classic") {
    return {
      backgroundColor: primary,
      backgroundImage: `radial-gradient(circle at center, transparent 0 22%, ${accent}55 23% 25%, transparent 26% 42%, ${accent}35 43% 45%, transparent 46%), linear-gradient(135deg, ${primary}, ${secondary})`,
      color: accent,
    };
  }

  return {
    backgroundColor: secondary,
    backgroundImage: `linear-gradient(30deg, ${primary} 12%, transparent 12.5%, transparent 87%, ${primary} 87.5%, ${primary}), linear-gradient(150deg, ${primary} 12%, transparent 12.5%, transparent 87%, ${primary} 87.5%, ${primary}), linear-gradient(30deg, ${primary} 12%, transparent 12.5%, transparent 87%, ${primary} 87.5%, ${primary}), linear-gradient(150deg, ${primary} 12%, transparent 12.5%, transparent 87%, ${primary} 87.5%, ${primary}), linear-gradient(60deg, ${accent}33 25%, transparent 25.5%, transparent 75%, ${accent}33 75%, ${accent}33)`,
    backgroundPosition: "0 0, 0 0, 28px 49px, 28px 49px, 0 0",
    backgroundSize: "56px 98px",
    color: accent,
  };
}

function safeColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export default function CardBack({
  className,
  label = "Score Loser",
  backStyle = DEFAULT_DECK_BACK.backStyle,
  primaryColor = DEFAULT_DECK_BACK.backPrimaryColor,
  secondaryColor = DEFAULT_DECK_BACK.backSecondaryColor,
  accentColor = DEFAULT_DECK_BACK.backAccentColor,
}: CardBackProps) {
  const safePrimary = safeColor(primaryColor, DEFAULT_DECK_BACK.backPrimaryColor);
  const safeSecondary = safeColor(secondaryColor, DEFAULT_DECK_BACK.backSecondaryColor);
  const safeAccent = safeColor(accentColor, DEFAULT_DECK_BACK.backAccentColor);
  return (
    <div
      className={cn("relative z-0 h-60 w-44 shrink-0 select-none", className)}
      data-back-style={backStyle}
      aria-label={`${label} deck back`}
    >
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border-4 border-white p-3 shadow-xl"
        style={pattern(backStyle, safePrimary, safeSecondary, safeAccent)}
      >
        <div className="absolute inset-2 rounded-lg border" style={{ borderColor: `${safeAccent}aa` }} />
        <div className="absolute inset-4 rounded-md border" style={{ borderColor: `${safeAccent}66` }} />
        <div
          className="relative max-w-full -rotate-6 rounded-lg border-2 px-3 py-2 text-center text-base font-black uppercase leading-tight tracking-[0.12em] shadow-lg backdrop-blur-sm"
          style={{ borderColor: safeAccent, backgroundColor: `${safeSecondary}cc`, color: safeAccent }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
