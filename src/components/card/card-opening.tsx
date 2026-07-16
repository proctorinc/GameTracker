"use client";

import { useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { Button } from "../ui/button";
import Link from "next/link";
import { openCardDrop } from "@/app/actions/card";
import type { CollectibleCardViewModel } from "@/lib/card-catalog";
import { CARD_RARITY_LABELS } from "@/lib/card-catalog";
import CardBack from "./CardBack";
import { CollectibleCard } from "./collectible-card";
import type { DeckBackStyle } from "@/lib/db/schema";

type CardOpeningDrop = {
  id: string;
  cardCount: number;
  deckName: string | null;
  deck: {
    name: string;
    label: string;
    description: string;
    backStyle: DeckBackStyle;
    backPrimaryColor: string;
    backSecondaryColor: string;
    backAccentColor: string;
  } | null;
};

export const SUIT_LABELS: Record<string, string> = {
  ["DARK_BLUE"]: "Negative",
  ["LIGHT_BLUE"]: "Zero",
  ["GREEN"]: "Green",
  ["YELLOW"]: "Yellow",
  ["RED"]: "Red",
};

export const VALUE_LABELS: Record<string, string> = {
  [-2]: "Negative Two",
  [-1]: "Negative One",
  [0]: "Zero",
  [1]: "One",
  [2]: "Two",
  [3]: "Three",
  [4]: "Four",
  [5]: "Five",
  [6]: "Six",
  [7]: "Seven",
  [8]: "Eight",
  [9]: "Nine",
  [10]: "Ten",
  [11]: "Eleven",
  [12]: "Twelve",
};

export default function CardOpening({
  alreadyOpened,
  drop,
  remainingPackCount,
}: {
  alreadyOpened: boolean;
  drop: CardOpeningDrop | null;
  remainingPackCount: number;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  // Store all pulled cards here (handles single card or full pack arrays)
  const [cards, setCards] = useState<CollectibleCardViewModel[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);

  // Visual Thump Refs
  const thump1Ref = useRef<HTMLDivElement>(null);
  const thump2Ref = useRef<HTMLDivElement>(null);
  const thump3Ref = useRef<HTMLDivElement>(null);
  const finalExplosionRef = useRef<HTMLDivElement>(null);

  // const handleGenerate = async () => {
  //   if (isGeneratingCard || isAnimating) return;
  //   setIsGeneratingCard(true);

  //   try {
  //     const pulledCard = await pullCard(user.id);
  //     setCards([pulledCard]); // Wrap single card in an array
  //     setIsGeneratingCard(false);
  //   } catch (error) {
  //     console.error("Failed to pull card:", error);
  //     setIsGeneratingCard(false);
  //   }
  // }

  const handleGeneratePack = async () => {
    if (!drop || isGeneratingCard || isAnimating) return;
    setIsGeneratingCard(true);
    setErrorMessage(null);

    try {
      const pulledCards = await openCardDrop({ cardDropId: drop.id });
      setCards(pulledCards); // Directly save the array of cards
      setIsGeneratingCard(false);
    } catch (error) {
      console.error("Failed to pull pack:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Could not open this pack",
      );
      setIsGeneratingCard(false);
    }
  };

  function triggerAnimation() {
    if (!stageRef.current || !fanRef.current || !mainCardRef.current) return;

    setHasAnimated(true);
    if (isAnimating) return;
    setIsAnimating(true);

    // --- RESET STATES ---
    gsap.set(fanRef.current.children, {
      rotation: 0,
      x: 0,
      y: 150,
      opacity: 0,
      scale: 1,
    });
    gsap.set(mainCardRef.current.children, {
      scale: 0,
      rotationY: 180,
      opacity: 0,
    });
    gsap.set(beamRef.current, { x: "-150%", opacity: 0 });
    gsap.set(stageRef.current, { x: 0, y: 0, rotation: 0 });

    gsap.set([thump1Ref.current, thump2Ref.current, thump3Ref.current], {
      scale: 0.2,
      opacity: 0,
    });
    if (thump1Ref.current)
      gsap.set(thump1Ref.current.querySelectorAll(".ring-element"), {
        scale: 0.5,
        opacity: 0,
      });
    if (thump2Ref.current)
      gsap.set(thump2Ref.current.querySelectorAll(".ring-element"), {
        scale: 0.5,
        opacity: 0,
      });
    if (thump3Ref.current)
      gsap.set(thump3Ref.current.querySelectorAll(".ring-element"), {
        scale: 0.5,
        opacity: 0,
      });
    gsap.set(finalExplosionRef.current, { scale: 0, opacity: 0 });

    const tl = gsap.timeline({
      onComplete: () => setIsAnimating(false),
    });

    // --- THREE PRE-THUMPS ---
    // Thump 1: Blue
    tl.to(stageRef.current, {
      x: "random(-3, 3)",
      y: "random(-3, 3)",
      duration: 0.04,
      repeat: 6,
      yoyo: true,
    })
      .to(
        thump1Ref.current,
        { opacity: 1, scale: 1.8, duration: 0.25, ease: "power2.out" },
        0,
      )
      .to(
        thump1Ref.current?.querySelector(".ring-sharp") || [],
        { scale: 2.2, opacity: 0.8, duration: 0.2, ease: "power3.out" },
        0,
      )
      .to(
        [
          thump1Ref.current,
          thump1Ref.current?.querySelector(".ring-sharp"),
        ].filter(Boolean),
        { opacity: 0, duration: 0.15, ease: "power1.in" },
        0.15,
      );

    // Thump 2: Amber
    tl.to(
      stageRef.current,
      {
        x: "random(-6, 6)",
        y: "random(-6, 6)",
        rotation: "random(-1, 1)",
        duration: 0.04,
        repeat: 8,
        yoyo: true,
      },
      "+=0.05",
    )
      .to(
        thump2Ref.current,
        { opacity: 1, scale: 2.3, duration: 0.25, ease: "power2.out" },
        "-=0.35",
      )
      .to(
        thump2Ref.current?.querySelector(".ring-sharp") || [],
        { scale: 2.6, opacity: 0.9, duration: 0.2, ease: "power3.out" },
        "-=0.35",
      )
      .to(
        [
          thump2Ref.current,
          thump2Ref.current?.querySelector(".ring-sharp"),
        ].filter(Boolean),
        { opacity: 0, duration: 0.15, ease: "power1.in" },
        "-=0.15",
      );

    // Thump 3: Crimson White-Hot
    tl.to(
      stageRef.current,
      {
        x: "random(-10, 10)",
        y: "random(-10, 10)",
        rotation: "random(-3, 3)",
        duration: 0.04,
        repeat: 10,
        yoyo: true,
      },
      "+=0.05",
    )
      .to(
        thump3Ref.current,
        { opacity: 1, scale: 2.8, duration: 0.25, ease: "power3.out" },
        "-=0.45",
      )
      .to(
        thump3Ref.current?.querySelector(".ring-sharp") || [],
        { scale: 3.2, opacity: 1, duration: 0.2, ease: "power4.out" },
        "-=0.45",
      )
      .to(
        [
          thump3Ref.current,
          thump3Ref.current?.querySelector(".ring-sharp"),
        ].filter(Boolean),
        { opacity: 0, duration: 0.2, ease: "power2.in" },
        "-=0.2",
      );

    tl.to(stageRef.current, { x: 0, y: 0, rotation: 0, duration: 0.04 });

    // --- DECK FAN OUT ---
    // If it's a single card, don't rotate or split it out dynamically
    const dynamicFanSpread = cards.length > 1 ? 52 : 0;
    const dynamicFanRotation = cards.length > 1 ? 15 : 0;

    tl.to(
      fanRef.current.children,
      {
        opacity: 1,
        y: 0,
        x: (index) => (index - (cards.length - 1) / 2) * dynamicFanSpread,
        rotation: (index) =>
          (index - (cards.length - 1) / 2) * dynamicFanRotation,
        duration: 0.35,
        stagger: 0.02,
        ease: "back.out(1.6)",
      },
      "-=0.05",
    );

    // --- SUSPENSE DELAY ---
    tl.to({}, { duration: 0.45 });

    // --- GRAND FINAL EXPLOSION & REVEAL ---
    tl.to(
      finalExplosionRef.current,
      { opacity: 1, scale: 1.5, duration: 0.08, ease: "power4.in" },
      "-=0.08",
    ).to(finalExplosionRef.current, {
      opacity: 0,
      scale: 6.0,
      duration: 0.65,
      ease: "power3.out",
    });

    tl.to(
      fanRef.current.children,
      {
        opacity: 0,
        y: "+=30",
        scale: 0.9,
        duration: 0.4,
        stagger: 0.01,
        ease: "power2.in",
      },
      "-=0.65",
    );

    // Reveal final cards simultaneously
    tl.to(
      mainCardRef.current.children,
      {
        opacity: 1,
        scale: 1.15,
        rotationY: 0,
        x: (index) =>
          cards.length > 1 ? (index - (cards.length - 1) / 2) * 190 : 0, // Spread final cards horizontally
        duration: 0.45,
        ease: "back.out(0.3)",
      },
      "-=0.65",
    )

      // --- DIAGONAL LIGHT BEAM SWEEP ---
      .to(
        beamRef.current,
        { opacity: 1, x: "150%", duration: 0.55, ease: "power2.inOut" },
        "-=0.25",
      )
      .to(beamRef.current, { opacity: 0, duration: 0.1 }, "-=0.1")

      .to(
        mainCardRef.current.children,
        { scale: 1, duration: 0.15, ease: "power1.inOut" },
        "-=0.15",
      );
  }

  // Trigger animation safely after React flushes the DOM updates for the new card(s)
  useEffect(() => {
    if (cards.length > 0 && !hasAnimated && !isAnimating) {
      // GSAP needs the rendered card nodes before the reveal timeline starts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      triggerAnimation();
    }
    // The animation intentionally runs once for each newly opened pack.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center py-4">
      {/* Dynamic Header Information */}
      {cards.length > 0 && hasAnimated && !isAnimating && (
        <div className="absolute top-10 text-center text-wrap space-y-2 z-30">
          {cards.length === 1 ? (
            <>
              <h1 className="text-balance text-center text-4xl font-black">
                You got {cards[0].subject?.name ?? cards[0].name}!
              </h1>
              <p className="font-bold text-muted-foreground">
                {CARD_RARITY_LABELS[cards[0].rarity]} · {cards[0].deckLabel}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-balance text-center text-4xl font-black">
                You got {cards.length} cards!
              </h1>
              <p className="text-sm text-muted-foreground">
                Check your rewards below
              </p>
            </>
          )}
        </div>
      )}

      <div
        ref={stageRef}
        className="relative w-full h-[450px] flex items-center justify-center perspective-1000 overflow-visible"
      >
        {cards.length === 0 && drop && (
          <div className="absolute z-50 flex flex-col items-center gap-4">
            <button onClick={handleGeneratePack} className="relative w-44 h-60">
              <CardBack
                className="absolute left-0 top-0"
                label={drop.deck?.label}
                backStyle={drop.deck?.backStyle}
                primaryColor={drop.deck?.backPrimaryColor}
                secondaryColor={drop.deck?.backSecondaryColor}
                accentColor={drop.deck?.backAccentColor}
              />
              <CardBack className="absolute left-[4px] -top-[2px]" />
              <CardBack className="absolute left-[8px] -top-[4px]" />
              <CardBack className="absolute left-[12px] -top-[6px]" />
              <CardBack className="absolute left-[16px] -top-[8px]" />
            </button>
            <div className="flex gap-4">
              <Button
                onClick={handleGeneratePack}
                disabled={isGeneratingCard}
                className="shadow-lg"
              >
                {isGeneratingCard ? "Opening..." : "Open pack"}
              </Button>
            </div>
            {errorMessage ? (
              <p className="max-w-xs text-center text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}
          </div>
        )}

        {cards.length === 0 && !drop ? (
          <div className="absolute z-50 flex max-w-sm flex-col items-center gap-4 px-6 text-center">
            <h1 className="text-3xl font-black">
              {alreadyOpened ? "Pack already opened" : "No packs to open"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {alreadyOpened
                ? "Those cards are safely stored in your collection."
                : "Complete a game with another registered player to earn your next five-card pack."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button render={<Link href="/profile?tab=collection" />}>
                View collection
              </Button>
              <Button render={<Link href="/dashboard" />} variant="outline">
                Back to dashboard
              </Button>
            </div>
          </div>
        ) : null}

        {/* FX Layers */}
        <div
          ref={thump1Ref}
          className="absolute w-24 h-24 rounded-full bg-cyan-500/10 blur-md opacity-0 pointer-events-none flex items-center justify-center shadow-[0_0_50px_20px_rgba(6,182,212,0.3)]"
        >
          <div className="ring-element ring-sharp absolute w-full h-full rounded-full border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
        </div>

        <div
          ref={thump2Ref}
          className="absolute w-28 h-28 rounded-full bg-amber-500/10 blur-md opacity-0 pointer-events-none flex items-center justify-center shadow-[0_0_60px_30px_rgba(245,158,11,0.35)]"
        >
          <div className="ring-element ring-sharp absolute w-full h-full rounded-full border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
        </div>

        <div
          ref={thump3Ref}
          className="absolute w-32 h-32 rounded-full bg-rose-600/10 blur-lg opacity-0 pointer-events-none flex items-center justify-center shadow-[0_0_80px_40px_rgba(225,29,72,0.4)]"
        >
          <div className="ring-element ring-sharp absolute w-full h-full rounded-full border-4 border-white shadow-[0_0_30px_10px_rgba(244,63,94,0.8),inset_0_0_15px_rgba(255,255,255,1)]" />
        </div>

        <div
          ref={finalExplosionRef}
          className="absolute w-56 h-56 rounded-full bg-white blur-2xl opacity-0 pointer-events-none z-40 mix-blend-screen shadow-[0_0_180px_100px_rgba(255,255,255,1),0_0_350px_180px_rgba(252,211,77,0.65)]"
        />

        {/* Background Deck Layout (Fanning before opening) */}
        <div
          ref={fanRef}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          {cards.map((c, index) => (
            <CardBack
              key={`card-mock-${index}`}
              className="absolute opacity-0 transform origin-bottom"
              label={drop?.deck?.label}
              backStyle={drop?.deck?.backStyle}
              primaryColor={drop?.deck?.backPrimaryColor}
              secondaryColor={drop?.deck?.backSecondaryColor}
              accentColor={drop?.deck?.backAccentColor}
            />
          ))}
        </div>

        {/* Main Pulled Cards Container */}
        <div
          ref={mainCardRef}
          className="absolute pl-54 pr-8 inset-0 flex items-center justify-center pointer-events-none z-20 overflow-x-auto"
        >
          <div
            ref={beamRef}
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transform -skew-x-32 -translate-x-[100%] z-50 pointer-events-none mix-blend-overlay"
          />

          {/* Map each pulled card element horizontally */}
          {cards.map((c, index) => (
            <div
              key={`reveal-${c.instanceId || index}`}
              className="absolute w-44 h-60 opacity-0 pointer-events-auto rounded-xl"
              style={{ transformStyle: "preserve-3d" }}
            >
              <CollectibleCard card={c} />
            </div>
          ))}
        </div>
      </div>

      {hasAnimated && !isAnimating && (
        <div className="z-50 flex flex-wrap justify-center gap-3">
          <Button render={<Link href="/profile?tab=collection" />}>
            View collection
          </Button>
          {remainingPackCount > 1 ? (
            <Button
              render={
                <Link href={`/card/pull?deck=${drop?.deckName ?? "standard"}`} />
              }
              variant="outline"
            >
              Open next pack
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
