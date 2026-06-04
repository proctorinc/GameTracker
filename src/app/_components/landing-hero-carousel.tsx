"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const slides = [
  {
    title: "Dashboard",
    darkSrc: "/images/home-feed.png",
    lightSrc: "/images/home-feed-light.png",
  },
  {
    title: "Play Page",
    darkSrc: "/images/play-page.png",
    lightSrc: "/images/play-page-light.png",
  },
  {
    title: "Profile Page",
    darkSrc: "/images/profile-page.png",
    lightSrc: "/images/profile-page-light.png",
  },
  {
    title: "Game History",
    darkSrc: "/images/game-history.png",
    lightSrc: "/images/game-history-light.png",
  },
];

export function LandingHeroCarousel() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!scrollerRef.current) {
      return;
    }
    const scroller = scrollerRef.current;

    function updateActiveSlide() {
      const firstCard = scroller.querySelector<HTMLElement>("[data-slide-card]");
      if (!firstCard) {
        return;
      }

      const stride = firstCard.offsetWidth + 16;
      const nextIndex = Math.round(scroller.scrollLeft / stride);
      setActiveIndex(Math.max(0, Math.min(slides.length - 1, nextIndex)));
    }

    updateActiveSlide();
    scroller.addEventListener("scroll", updateActiveSlide, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", updateActiveSlide);
    };
  }, []);

  function scrollToCard(index: number) {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const firstCard = scroller.querySelector<HTMLElement>("[data-slide-card]");
    if (!firstCard) {
      return;
    }

    scroller.scrollTo({
      left: index * (firstCard.offsetWidth + 16),
      behavior: "smooth",
    });
  }

  return (
    <div className="space-y-3">
      <div
        ref={scrollerRef}
        className="flex pl-4 snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          <div
            key={`${slide.title}-${index}`}
            data-slide-card
            className="relative w-[84%] shrink-0 snap-start overflow-hidden rounded-xl border border-border/80 shadow-[0_22px_44px_rgba(15,23,42,0.12),0_8px_18px_rgba(15,23,42,0.08)] dark:border-white/12 dark:shadow-[0_28px_64px_rgba(0,0,0,0.56),0_10px_24px_rgba(255,255,255,0.04)]"
          >
            <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.07)_16%,rgba(255,255,255,0)_34%,rgba(0,0,0,0.06)_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.05)_14%,rgba(255,255,255,0)_32%,rgba(0,0,0,0.18)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 z-10 h-10 rounded-b-[2rem] bg-white/14 blur-2xl dark:bg-white/7" />
            <div className="relative aspect-[9/14] w-full bg-muted">
              <Image
                src={slide.lightSrc}
                alt="ScoreLoser app preview"
                fill
                priority={index === 0}
                className="object-cover object-top dark:hidden"
                sizes="(max-width: 768px) 84vw, 360px"
              />
              <Image
                src={slide.darkSrc}
                alt="ScoreLoser app preview"
                fill
                priority={index === 0}
                className="hidden object-cover object-top dark:block"
                sizes="(max-width: 768px) 84vw, 360px"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            aria-label={`Show ${slide.title}`}
            onClick={() => scrollToCard(index)}
            className={cn(
              "h-2 rounded-full transition-all",
              activeIndex === index ? "w-6 bg-foreground" : "w-2 bg-border",
            )}
          />
        ))}
      </div>
    </div>
  );
}
