"use client";

import type { PlayedTitlesPageData } from "@/app/actions/pages/played-titles";
import GameTitleImage from "@/components/game/game-title-image";
import ProfilePicture from "@/components/profile/profile-picture";
import { Button } from "@/components/ui/button";
import { CardEmpty } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const SEARCH_CLOSED_HEIGHT = 56;
const SEARCH_OPEN_HEIGHT = 132;
const CARD_HEIGHT_RATIO = 0.6;
const CARD_HEIGHT_MIN = 384;
const CARD_HEIGHT_MAX = 608;
const CARD_TRANSITION_RATIO = 0.72;
const COLLAPSED_PEEK = 64;
const STACK_EXIT_PADDING = 120;
const MAX_VISIBLE_PLAYED_WITH = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function formatAverageScore(value: number | null) {
  if (value === null) {
    return "--";
  }

  return value.toFixed(1).replace(".0", "");
}

function getStackCardY(input: {
  relativeIndex: number;
  cardHeight: number;
  incomingY: number;
  expandedY: number;
}) {
  const { relativeIndex, cardHeight, incomingY, expandedY } = input;
  const topCollapsedY = 0;
  const middleCollapsedY = COLLAPSED_PEEK;

  if (relativeIndex <= -2) {
    return topCollapsedY;
  }

  if (relativeIndex < -1) {
    return lerp(topCollapsedY, middleCollapsedY, relativeIndex + 2);
  }

  if (relativeIndex < 0) {
    return lerp(middleCollapsedY, expandedY, relativeIndex + 1);
  }

  if (relativeIndex < 1) {
    return lerp(expandedY, middleCollapsedY, relativeIndex);
  }

  if (relativeIndex < 2) {
    return lerp(incomingY, expandedY, relativeIndex - 1);
  }

  return incomingY + (relativeIndex - 2) * 40;
}

function PlayedTitleCard({
  title,
  index,
  y,
  cardHeight,
  onSelect,
}: {
  title: PlayedTitlesPageData["gameTitles"][number];
  index: number;
  y: number;
  cardHeight: number;
  onSelect: () => void;
}) {
  const playedWith = title.playedWith ?? [];

  return (
    <article
      className="absolute inset-x-0 top-0"
      style={{
        transform: `translateY(${y}px)`,
        zIndex: index + 1,
      }}
    >
      <div style={{ height: `${cardHeight}px` }}>
        <GameTitleImage
          className="relative flex h-full flex-col justify-between shadow-2xl"
          color={title.color}
          contentClassName="h-full"
          imageUrl={title.imageUrl}
          variant="hero"
        >
          <button
            aria-label={`Center ${title.title}`}
            className="absolute inset-0 z-10 rounded-xl"
            onClick={onSelect}
            type="button"
          />

          <div className="relative z-20 flex h-full flex-col justify-between p-5 text-white sm:p-6">
            <div>
              <h2 className="max-w-[16rem] text-3xl font-black leading-tight drop-shadow-sm sm:text-4xl">
                {title.title}
              </h2>
            </div>

            <div className="space-y-4">
              {playedWith.length > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex -space-x-2">
                    {playedWith
                      .slice(0, MAX_VISIBLE_PLAYED_WITH)
                      .map((player) => (
                        <ProfilePicture
                          key={player.id}
                          className="border-2 border-white/70 shadow-sm"
                          size="sm"
                          user={player}
                        />
                      ))}
                    {playedWith.length > MAX_VISIBLE_PLAYED_WITH ? (
                      <div className="flex size-10 items-center justify-center rounded-full border-2 border-white/70 bg-slate-900/35 text-[0.72rem] font-black text-white shadow-sm backdrop-blur-sm dark:bg-black/35">
                        +{playedWith.length - MAX_VISIBLE_PLAYED_WITH}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-white/14 bg-slate-900/22 px-3 py-3 backdrop-blur-sm dark:bg-black/22">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-white/62">
                    Plays
                  </p>
                  <p className="mt-2 text-xl font-black">{title.timesPlayed}</p>
                </div>
                <div className="rounded-xl border border-white/14 bg-slate-900/22 px-3 py-3 backdrop-blur-sm dark:bg-black/22">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-white/62">
                    Top 3
                  </p>
                  <p className="mt-2 text-xl font-black">
                    {title.topThreeFinishes}
                  </p>
                </div>
                <div className="rounded-xl border border-white/14 bg-slate-900/22 px-3 py-3 backdrop-blur-sm dark:bg-black/22">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-white/62">
                    Avg
                  </p>
                  <p className="mt-2 text-xl font-black">
                    {formatAverageScore(title.averageScore)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  className="relative z-20 rounded-full bg-white px-4 text-slate-800 hover:bg-white/92 dark:text-slate-950"
                  render={
                    <Link href={`/game/create/settings?titleId=${title.id}`} />
                  }
                  size="sm"
                >
                  Play again
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </GameTitleImage>
      </div>
    </article>
  );
}

export default function PlayedTitlesLibraryPage({
  data,
}: {
  data: PlayedTitlesPageData;
}) {
  const [query, setQuery] = useState(data.filters.query);
  const [searchOpen, setSearchOpen] = useState(Boolean(data.filters.query));
  const [scrollProgress, setScrollProgress] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("query", query.trim());
    }

    const nextUrl = params.size
      ? `/titles/played?${params.toString()}`
      : "/titles/played";
    window.history.replaceState(null, "", nextUrl);
  }, [query]);

  useEffect(() => {
    function handleResize() {
      setViewportHeight(window.innerHeight);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const visibleTitles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return data.gameTitles;
    }

    return data.gameTitles.filter((title) =>
      [title.title, title.normalizedTitle].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [data.gameTitles, query]);

  const stickyHeaderHeight = searchOpen
    ? SEARCH_OPEN_HEIGHT
    : SEARCH_CLOSED_HEIGHT;
  const cardHeight = clamp(
    viewportHeight * CARD_HEIGHT_RATIO,
    CARD_HEIGHT_MIN,
    CARD_HEIGHT_MAX,
  );
  const stackStep = Math.round(cardHeight * CARD_TRANSITION_RATIO);
  const expandedY = COLLAPSED_PEEK * 2 + 12;
  const incomingY = expandedY + cardHeight * 0.82;

  const stackMetrics = useMemo(() => {
    const count = visibleTitles.length;
    const maxScrollTop = Math.max(0, (count - 1) * stackStep);
    const stackHeight = expandedY + cardHeight;
    const containerHeight = viewportHeight + maxScrollTop + STACK_EXIT_PADDING;

    return {
      maxScrollTop,
      stackHeight,
      containerHeight,
    };
  }, [
    cardHeight,
    expandedY,
    incomingY,
    stackStep,
    viewportHeight,
    visibleTitles.length,
  ]);

  useEffect(() => {
    const scrollViewport = scrollViewportRef.current;
    if (!scrollViewport) {
      return;
    }

    function updateScrollProgress() {
      if (scrollViewport) {
        setScrollProgress(
          clamp(scrollViewport.scrollTop, 0, stackMetrics.maxScrollTop),
        );
      }
    }

    updateScrollProgress();
    scrollViewport.addEventListener("scroll", updateScrollProgress, {
      passive: true,
    });

    return () => {
      scrollViewport.removeEventListener("scroll", updateScrollProgress);
    };
  }, [stackMetrics.maxScrollTop]);

  const hasAnyTitles = data.gameTitles.length > 0;

  return (
    <div className="h-[100svh] overflow-hidden">
      <div
        className="h-full overflow-y-auto overscroll-none px-4 pb-16 scrollbar-none"
        ref={scrollViewportRef}
      >
        <div className="mx-auto flex w-full max-w-md flex-col gap-5">
          {!hasAnyTitles ? (
            <CardEmpty className="flex flex-col items-center gap-3 rounded-xl p-10 text-center">
              <p>You haven&apos;t played any titled games yet.</p>
              <Button
                render={<Link href="/game/create/settings" />}
                variant="outline"
              >
                Start a game
                <ArrowRight className="size-4" />
              </Button>
            </CardEmpty>
          ) : visibleTitles.length === 0 ? (
            <CardEmpty className="flex flex-col items-center gap-3 rounded-xl p-10 text-center">
              <p>No played titles match this search yet.</p>
              <button
                className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                onClick={() => {
                  setQuery("");
                  setSearchOpen(false);
                }}
                type="button"
              >
                Clear search
              </button>
            </CardEmpty>
          ) : (
            <div
              className="relative"
              style={{ height: `${stackMetrics.containerHeight}px` }}
            >
              <div className="sticky top-0 h-[100svh]">
                <div className="mx-auto flex h-full w-full max-w-md flex-col gap-5 pt-2">
                  <div className="relative z-30 flex items-center justify-between gap-3">
                    <h1 className="text-4xl font-black tracking-tight">
                      My library
                    </h1>
                    <Button
                      aria-label={searchOpen ? "Close search" : "Open search"}
                      className="rounded-full"
                      onClick={() => {
                        if (searchOpen && !query.trim()) {
                          setSearchOpen(false);
                          return;
                        }

                        setSearchOpen((current) => !current);
                      }}
                      size="icon-sm"
                      variant="outline"
                    >
                      {searchOpen ? (
                        <X className="size-4" />
                      ) : (
                        <Search className="size-4" />
                      )}
                    </Button>
                  </div>

                  <div
                    className="relative z-30"
                    style={{ minHeight: `${stickyHeaderHeight}px` }}
                  >
                    {searchOpen ? (
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          aria-label="Search played titles"
                          autoFocus
                          className="h-12 rounded-xl border-none bg-muted/70 pl-11 shadow-none"
                          name="query"
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search your played titles"
                          value={query}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div
                    className="relative z-10 flex-1 overflow-visible"
                    style={{ height: `${stackMetrics.stackHeight}px` }}
                  >
                    {visibleTitles.map((title, index) => {
                      const relativeIndex =
                        index - scrollProgress / Math.max(stackStep, 1);
                      const y = getStackCardY({
                        relativeIndex,
                        cardHeight,
                        incomingY,
                        expandedY,
                      });

                      return (
                        <PlayedTitleCard
                          cardHeight={cardHeight}
                          index={index}
                          key={title.id}
                          onSelect={() => {
                            scrollViewportRef.current?.scrollTo({
                              top: index * stackStep,
                              behavior: "smooth",
                            });
                          }}
                          title={title}
                          y={y}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
