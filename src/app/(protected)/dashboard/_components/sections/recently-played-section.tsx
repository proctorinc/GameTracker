"use client";

import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import GameTitleImage from "@/components/game/game-title-image";
import { sectionActionClassName } from "@/components/ui/section-styles";
import { CardContent, CardEmpty } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useDashboardPage } from "../dashboard-page-provider";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import styles from "./recently-played-section.module.css";

type RecentGameTitle = DashboardPageData["recentGameTitles"][number];

function RecentlyPlayedCard({ gameTitle }: { gameTitle: RecentGameTitle }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const titleColor = gameTitle.color?.trim() || "#64748b";
  const timesPlayed = gameTitle.timesPlayed ?? 0;

  function toggleCard() {
    setIsFlipped((current) => !current);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleCard();
    }
  }

  return (
    <div className={styles.cardScene}>
      <div
        className={cn(styles.playingCard, isFlipped && styles.flipped)}
        style={{ "--game-title-color": titleColor } as CSSProperties}
        role="button"
        tabIndex={0}
        aria-pressed={isFlipped}
        aria-label={`${isFlipped ? "Hide" : "Show"} ${gameTitle.title} play details`}
        onClick={toggleCard}
        onKeyDown={handleKeyDown}
      >
        <div className={cn(styles.cardFace, styles.cardFront)}>
          <GameTitleImage
            className="game-title-scroll-card h-full w-full rounded-[inherit] border-0"
            color={gameTitle.color}
            contentClassName="h-full"
            imageUrl={gameTitle.imageUrl}
            verticalFocus={gameTitle.imageVerticalFocus}
          >
            <div className={styles.dotTexture} aria-hidden="true" />
            <div className={styles.sheen} aria-hidden="true" />
            <div className={styles.glint} aria-hidden="true" />
            <div className={styles.frame} aria-hidden="true" />

            <div className="relative z-10 flex h-full flex-col p-4 text-white">
              <p className="max-w-32 text-[1.35rem] leading-[1.02] font-black tracking-tight text-balance drop-shadow-md">
                {gameTitle.title}
              </p>
            </div>
          </GameTitleImage>
        </div>

        <div className={cn(styles.cardFace, styles.cardBack)}>
          <div className={styles.dotTexture} aria-hidden="true" />
          <div className={styles.sheen} aria-hidden="true" />
          <div className={styles.glint} aria-hidden="true" />
          <div className={styles.frame} aria-hidden="true" />

          <div className="relative z-10 flex h-full flex-col p-4 text-white">
            <h3 className={styles.backTitle}>{gameTitle.title}</h3>

            <div
              className={styles.backStat}
              aria-label={`You have played ${gameTitle.title} ${timesPlayed} ${timesPlayed === 1 ? "time" : "times"}`}
            >
              <p className={styles.statNumber} aria-hidden="true">
                {timesPlayed}
              </p>
              <p className={styles.backLabel} aria-hidden="true">
                {timesPlayed === 1 ? "time played" : "times played"}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/titles/${gameTitle.id}`}
                className={cn(
                  "flex items-center justify-center rounded-full border border-white/70 bg-white/20 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  styles.playAction,
                )}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                Stats
              </Link>
              <Link
                href={`/game/create/settings?titleId=${gameTitle.id}`}
                className={cn(
                  "flex items-center justify-center rounded-full border border-white/70 bg-white/92 px-4 py-2 text-sm font-black text-slate-800 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:text-slate-950",
                  styles.playAction,
                )}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                Play
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecentlyPlayedSection() {
  const { recentGameTitles } = useDashboardPage();
  const shelfRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateCardTilts = useCallback(() => {
    const shelf = shelfRef.current;

    if (!shelf) {
      return;
    }

    const shelfBounds = shelf.getBoundingClientRect();

    if (shelfBounds.width === 0) {
      return;
    }

    shelf.querySelectorAll<HTMLElement>("[data-recent-title-card]").forEach(
      (card) => {
        const cardBounds = card.getBoundingClientRect();
        const cardCenter = cardBounds.left + cardBounds.width / 2;
        const centerPosition =
          (cardCenter - shelfBounds.left) / shelfBounds.width;
        const leftwardProgress = Math.min(
          1,
          Math.max(0, (0.58 - centerPosition) / 0.58),
        );

        card.style.setProperty(
          "--card-tilt",
          `${(-3 * leftwardProgress).toFixed(2)}deg`,
        );
      },
    );
  }, []);

  const scheduleCardTiltUpdate = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      updateCardTilts();
    });
  }, [updateCardTilts]);

  useEffect(() => {
    updateCardTilts();
    window.addEventListener("resize", scheduleCardTiltUpdate);

    return () => {
      window.removeEventListener("resize", scheduleCardTiltUpdate);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [recentGameTitles, scheduleCardTiltUpdate, updateCardTilts]);

  return (
    <div className="flex flex-col gap-4 w-full overflow-y-visible">
      {/*<div className="mx-4 flex items-center justify-between gap-3">
        <p className="font-bold">My Games</p>
        <Link href="/titles/played" className={sectionActionClassName}>
          View library
          <ArrowRight />
        </Link>
      </div>*/}
      <CardContent className="overflow-visible px-0">
        {recentGameTitles.length === 0 ? (
          <CardEmpty className="flex flex-col items-center gap-3">
            <p>No recent titles yet.</p>
            <Link
              href="/game/create/settings"
              className={sectionActionClassName}
            >
              Start a game
              <ArrowRight />
            </Link>
          </CardEmpty>
        ) : (
          <div className="overflow-visible">
            <div
              ref={shelfRef}
              className="flex snap-x snap-mandatory scroll-pl-4 gap-4 overflow-x-auto pb-7 pt-2 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              onScroll={scheduleCardTiltUpdate}
            >
              <div className="w-0 shrink-0" aria-hidden="true" />
              {recentGameTitles.map((gameTitle) => (
                <div
                  key={`title=${gameTitle.id}`}
                  className={styles.tiltWrapper}
                  data-recent-title-card
                >
                  <RecentlyPlayedCard gameTitle={gameTitle} />
                </div>
              ))}
              <div className="w-0 shrink-0" aria-hidden="true" />
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}
