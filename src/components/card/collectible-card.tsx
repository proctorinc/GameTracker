import type { CSSProperties } from "react";
import type { CollectibleCardViewModel } from "@/lib/card-catalog";
import { CARD_RARITY_LABELS } from "@/lib/card-catalog";
import { cn } from "@/lib/utils";

const PIECE_GLYPHS: Record<string, string> = {
  "playing-card": "🂠",
  die: "⚄",
  meeple: "♟",
  pawn: "♙",
  domino: "⚁",
  cube: "◆",
  tile: "▦",
  "first-player": "①",
  miniature: "♞",
  trophy: "♛",
};

function skyjoColor(value: number) {
  if (value < 0) return "linear-gradient(160deg,#3156d3,#172554)";
  if (value === 0) return "linear-gradient(160deg,#b8ecff,#38bdf8)";
  if (value <= 4) return "linear-gradient(160deg,#a7f3a0,#43b649)";
  if (value <= 8) return "linear-gradient(160deg,#fff3a3,#facc15)";
  return "linear-gradient(160deg,#ffb09f,#ef4444)";
}

const rarityClass = {
  common: "border-slate-200 shadow-slate-950/15",
  uncommon: "border-emerald-300 shadow-emerald-500/25 ring-1 ring-emerald-400/40",
  rare: "border-violet-300 shadow-violet-500/30 ring-2 ring-violet-400/45",
  legendary:
    "border-amber-300 shadow-amber-500/40 ring-2 ring-amber-300/60 before:absolute before:inset-0 before:bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,.4)_45%,transparent_70%)] before:animate-pulse motion-reduce:before:animate-none",
} as const;

export function CollectibleCard({
  card,
  compact = false,
  placeholder = false,
  className,
}: {
  card: CollectibleCardViewModel;
  compact?: boolean;
  placeholder?: boolean;
  className?: string;
}) {
  const config = card.config as Record<string, unknown>;
  const value = typeof config.value === "number" ? config.value : null;
  const accent = typeof config.accent === "string" ? config.accent : "#7c3aed";
  const piece = typeof config.piece === "string" ? config.piece : "playing-card";
  const subjectImage =
    card.subject?.type === "friend" ? card.subject.avatarUrl : card.subject?.type === "game_title" ? card.subject.imageUrl : null;
  const subjectColor = card.subject?.color ?? accent;
  const style: CSSProperties =
    card.renderer === "skyjo_number" && value !== null
      ? { background: skyjoColor(value) }
      : card.renderer === "game_piece"
        ? { background: `linear-gradient(155deg, color-mix(in srgb, ${accent} 25%, white), ${accent})` }
        : { background: `linear-gradient(155deg, color-mix(in srgb, ${subjectColor} 25%, white), ${subjectColor})` };

  return (
    <div
      className={cn(
        "relative isolate aspect-5/7 w-full overflow-hidden rounded-[16%] border-[3px] bg-muted text-slate-950 shadow-lg",
        rarityClass[card.rarity],
        compact ? "p-1.5" : "p-4",
        placeholder && "opacity-20 grayscale-[35%] shadow-none",
        className,
      )}
      style={style}
      data-rarity={card.rarity}
      data-placeholder={placeholder || undefined}
    >
      {subjectImage && !card.unavailable ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-85"
          style={{ backgroundImage: `url(${JSON.stringify(subjectImage)})` }}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-black/25" />
      <div className="relative z-10 flex h-full flex-col items-center justify-between text-center">
        <span
          className={cn(
            "self-start rounded-full bg-white/85 font-black uppercase tracking-wide text-slate-900",
            compact ? "px-1 py-0.5 text-[6px]" : "px-2 py-1 text-[10px]",
          )}
        >
          {CARD_RARITY_LABELS[card.rarity]}
        </span>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          {card.unavailable ? (
            <span className={cn("font-black", compact ? "text-xl" : "text-6xl")}>?</span>
          ) : card.renderer === "skyjo_number" && value !== null ? (
            <span
              className={cn(
                "font-black text-slate-900 [text-shadow:0_2px_0_white,2px_0_0_white,-2px_0_0_white,0_-2px_0_white]",
                compact ? "text-3xl" : "text-8xl",
              )}
            >
              {value}
            </span>
          ) : card.renderer === "game_piece" ? (
            <span className={cn("drop-shadow-lg", compact ? "text-3xl" : "text-8xl")}>
              {PIECE_GLYPHS[piece] ?? "◆"}
            </span>
          ) : subjectImage ? null : (
            <span className={cn("font-black text-white/90", compact ? "text-2xl" : "text-7xl")}>
              {card.renderer === "friend_profile" ? "☺" : "▣"}
            </span>
          )}
        </div>

        <div
          className={cn(
            "w-full rounded-lg bg-white/90 font-black leading-tight text-slate-950 shadow-sm",
            compact ? "line-clamp-2 px-1 py-1 text-[7px]" : "px-3 py-2 text-sm",
          )}
        >
          {card.unavailable ? "Unavailable" : card.subject?.name ?? card.name}
        </div>
      </div>
    </div>
  );
}
