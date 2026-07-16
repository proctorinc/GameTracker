"use client";

import type { CSSProperties, ReactNode } from "react";
import { createContext, useContext, useId, useMemo } from "react";
import {
  Compass,
  Crown,
  Map,
  ScrollText,
  Swords,
  Trophy,
} from "lucide-react";

import { cn } from "@/lib/utils";

import styles from "./dashboard-style-demo.module.css";

type MaterialIconName =
  | "compass"
  | "crown"
  | "map"
  | "scroll"
  | "swords"
  | "trophy";

type AdventureFilterIds = {
  paper: string;
  torn: string;
  ink: string;
  gold: string;
  wax: string;
};

const AdventureFilterContext = createContext<AdventureFilterIds | null>(null);

function makeFilterId(prefix: string, reactId: string) {
  return `${prefix}-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function AdventureTextureProvider({ children }: { children: ReactNode }) {
  const reactId = useId();
  const ids = useMemo(
    () => ({
      paper: makeFilterId("expedition-paper", reactId),
      torn: makeFilterId("expedition-torn", reactId),
      ink: makeFilterId("expedition-ink", reactId),
      gold: makeFilterId("expedition-gold", reactId),
      wax: makeFilterId("expedition-wax", reactId),
    }),
    [reactId],
  );

  return (
    <AdventureFilterContext.Provider value={ids}>
      <svg className={styles.filterBank} aria-hidden="true">
        <defs>
          <filter id={ids.paper} x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.11"
              numOctaves="3"
              seed="19"
              result="paperNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="paperNoise"
              scale="3.2"
              xChannelSelector="R"
              yChannelSelector="G"
              result="roughPaper"
            />
            <feColorMatrix
              in="paperNoise"
              type="matrix"
              values="0 0 0 0 .30  0 0 0 0 .20  0 0 0 0 .08  0 0 0 .13 0"
              result="paperGrain"
            />
            <feComposite
              in="paperGrain"
              in2="roughPaper"
              operator="in"
              result="clippedPaperGrain"
            />
            <feBlend in="roughPaper" in2="clippedPaperGrain" mode="multiply" />
          </filter>
          <filter id={ids.torn} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.024 0.055"
              numOctaves="4"
              seed="43"
              stitchTiles="stitch"
              result="tearNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="tearNoise"
              scale="8"
              xChannelSelector="R"
              yChannelSelector="G"
              result="tornPaper"
            />
            <feColorMatrix
              in="tearNoise"
              type="matrix"
              values="0 0 0 0 .25  0 0 0 0 .15  0 0 0 0 .055  0 0 0 .18 0"
              result="dirtyFibers"
            />
            <feComposite
              in="dirtyFibers"
              in2="tornPaper"
              operator="in"
              result="clippedDirtyFibers"
            />
            <feBlend in="tornPaper" in2="clippedDirtyFibers" mode="multiply" />
          </filter>
          <filter id={ids.ink} x="-12%" y="-12%" width="124%" height="124%">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.028"
              numOctaves="2"
              seed="7"
              result="inkNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="inkNoise"
              scale="1.7"
              xChannelSelector="B"
              yChannelSelector="R"
            />
          </filter>
          <filter id={ids.gold} x="-35%" y="-35%" width="170%" height="170%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.7"
              numOctaves="2"
              seed="31"
              result="hammer"
            />
            <feDiffuseLighting
              in="hammer"
              surfaceScale="0.75"
              diffuseConstant="0.48"
              lightingColor="#c79338"
              result="litGold"
            >
              <feDistantLight azimuth="225" elevation="52" />
            </feDiffuseLighting>
            <feComposite in="litGold" in2="SourceGraphic" operator="in" result="metal" />
            <feBlend in="SourceGraphic" in2="metal" mode="soft-light" />
          </filter>
          <filter id={ids.wax} x="-16%" y="-16%" width="132%" height="132%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.095"
              numOctaves="3"
              seed="13"
              result="waxNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="waxNoise"
              scale="3.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <div
        className={styles.textureScope}
        style={
          {
            "--adventure-paper-edge": `url(#${ids.torn})`,
            "--adventure-paper-grain": `url(#${ids.paper})`,
            "--adventure-gold-hammer": `url(#${ids.gold})`,
            "--adventure-wax-distort": `url(#${ids.wax})`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </AdventureFilterContext.Provider>
  );
}

function useAdventureFilters() {
  const value = useContext(AdventureFilterContext);
  if (!value) {
    throw new Error("Adventure material artwork must be inside AdventureTextureProvider");
  }
  return value;
}

export function MaterialIcon({
  name,
  className,
}: {
  name: MaterialIconName;
  className?: string;
}) {
  const icons = {
    compass: Compass,
    crown: Crown,
    map: Map,
    scroll: ScrollText,
    swords: Swords,
    trophy: Trophy,
  };
  const Icon = icons[name];

  return (
    <span className={cn(styles.materialIcon, className)} aria-hidden="true">
      <svg viewBox="0 0 64 64" className={styles.materialIconFrame}>
        <path d="M10 19 20 9h24l10 10v26L44 55H20L10 45Z" />
        <path d="m17 23 7-7h16l7 7v18l-7 7H24l-7-7Z" />
        <circle cx="32" cy="32" r="19" />
        <circle cx="32" cy="32" r="16" />
        <path d="M32 10v5M32 49v5M10 32h5M49 32h5" />
      </svg>
      <Icon className={styles.materialIconGlyph} strokeWidth={2.2} />
    </span>
  );
}

export function WaxSeal({
  mark = "✦",
  className,
  tone = "red",
}: {
  mark?: string;
  className?: string;
  tone?: "red" | "umber";
}) {
  return (
    <span
      className={cn(styles.waxSeal, tone === "umber" && styles.waxSealUmber, className)}
      aria-hidden="true"
    >
      <span>{mark}</span>
    </span>
  );
}

export function ScrollEdge({ position }: { position: "top" | "bottom" }) {
  return (
    <svg
      className={cn(styles.scrollEdge, position === "bottom" && styles.scrollEdgeBottom)}
      viewBox="0 0 600 34"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M5 25C35 7 66 19 92 10c35-12 62 12 98 1 30-9 57 10 88 2 39-10 65 10 102-1 34-10 58 9 92 1 38-9 66 6 123-5v26H5Z" />
      <path d="M8 25c52-12 89 3 132-8 42-10 78 7 119-2 42-10 77 6 119-2 47-10 91 8 214-5" />
    </svg>
  );
}

export function TreasureMapArtwork() {
  const filters = useAdventureFilters();

  return (
    <svg
      className={styles.mapArtwork}
      viewBox="0 0 640 430"
      role="img"
      aria-label="Illustrated expedition map with a winding route to buried treasure"
    >
      <defs>
        <linearGradient id={`${filters.paper}-wash`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#efd79a" />
          <stop offset=".52" stopColor="#c9a968" />
          <stop offset="1" stopColor="#9a753e" />
        </linearGradient>
        <radialGradient id={`${filters.gold}-coin`} cx="35%" cy="28%" r="70%">
          <stop stopColor="#ffe39a" />
          <stop offset=".45" stopColor="#c88b25" />
          <stop offset="1" stopColor="#6d3d0d" />
        </radialGradient>
      </defs>
      <path
        d="M38 40c63-18 107 14 165-2 62-17 118 10 174-2 68-15 120 7 219-5l10 54-7 87 9 81-13 143c-79 10-122-13-184 2-57 13-112-10-168 3-61 15-113-11-201 1L30 326l9-90-10-84Z"
        fill={`url(#${filters.paper}-wash)`}
        stroke="#322010"
        strokeWidth="11"
        strokeLinejoin="round"
        filter={`url(#${filters.torn})`}
      />
      <g opacity=".23" fill="none" stroke="#513616" strokeWidth="2">
        <path d="M66 92c65 42 116-31 180 5s107-21 165 9 103-4 157 24" />
        <path d="M74 343c72-48 128 17 191-21 62-37 126 13 190-25 38-23 76-8 112-31" />
        <path d="M136 49c-7 58 26 91 4 140-20 46 17 80-5 143" />
        <path d="M487 54c22 51-11 87 8 135 18 44-11 84 2 147" />
      </g>
      <g filter={`url(#${filters.ink})`} stroke="#302012" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M104 304c42-65 78-28 105-82 27-53 76-12 104-62 31-55 71-13 118-58 28-26 60-19 91 3"
          fill="none"
          strokeWidth="8"
          strokeDasharray="2 18"
        />
        <g fill="#66512e" strokeWidth="5">
          <path d="m91 315 23-42 23 42h-13l17 27H83l18-27Z" />
          <path d="m263 172 21-39 20 39h-12l16 25h-51l16-25Z" />
          <path d="M391 112c18-34 49-37 70-3-17-6-29 0-36 20-7-19-18-25-34-17Z" />
        </g>
        <path d="M193 263c18-18 39-17 55 4-24-8-37 1-42 27-8-17-12-25-13-31Z" fill="#8b6b36" strokeWidth="4" />
        <path d="m509 77 31 31m0-31-31 31" stroke="#7f1d13" strokeWidth="12" />
        <path d="m509 77 31 31m0-31-31 31" stroke="#d79b3d" strokeWidth="3" />
      </g>
      <g transform="translate(86 80)" fill="none" stroke="#392313" strokeWidth="4">
        <circle r="44" fill="#d2b16f" fillOpacity=".48" />
        <circle r="34" />
        <path d="m0-49 9 39 40 10-40 9-9 40-9-40-40-9 40-10Z" fill="#7d5928" />
        <path d="M0-28 6-6 28 0 6 6 0 28-6 6-28 0-6-6Z" fill="#e4c77e" />
        <text x="0" y="-54" textAnchor="middle" fill="#392313" stroke="none" fontSize="17" fontWeight="900">N</text>
      </g>
      <g transform="translate(535 326)" filter={`url(#${filters.gold})`}>
        <circle r="48" fill={`url(#${filters.gold}-coin)`} stroke="#3a2108" strokeWidth="8" />
        <circle r="35" fill="none" stroke="#704310" strokeWidth="4" />
        <path d="M-16 6 0-22 16 6 0 25Z" fill="#6f4112" stroke="#2f1b08" strokeWidth="3" />
      </g>
      <g fill="#332012" fontFamily="Georgia, serif" fontWeight="700">
        <text x="76" y="379" fontSize="20">Whispering Pines</text>
        <text x="330" y="210" fontSize="18" transform="rotate(-8 330 210)">Old Crossing</text>
        <text x="444" y="70" fontSize="17">Fortune&apos;s Reach</text>
      </g>
    </svg>
  );
}

const materialStudies = [
  { kind: "scroll", eyebrow: "Aged paper", title: "Captain’s Scroll", copy: "Uneven fibers, inked edges, rolled rails, and a wax-red field mark." },
  { kind: "map", eyebrow: "Folded chart", title: "Waypoint Map", copy: "Contour lines, route stitching, compass geometry, and sun-faded creases." },
  { kind: "wood", eyebrow: "Carved timber", title: "Quartermaster’s Case", copy: "Gnarled grain, black cel shadows, rope corners, and hammered gold hardware." },
  { kind: "deck", eyebrow: "Treasure deck", title: "Fortune Card", copy: "A compact parchment face held inside a dark wood and gilded playing-card frame." },
] as const;

export function ExpeditionMaterialsAtelier() {
  return (
    <section className={cn(styles.panel, styles.atelier)} aria-labelledby="materials-atelier-title">
      <ScrollEdge position="top" />
      <div className={styles.sectionHeading}>
        <MaterialIcon name="compass" />
        <div>
          <p className={styles.eyebrow}>Expedition materials atelier</p>
          <h2 id="materials-atelier-title">One visual language, four field-tested surfaces.</h2>
        </div>
      </div>
      <p className={styles.atelierIntro}>
        Paper carries the story, timber gives it weight, and worn gold marks the things worth finding.
      </p>
      <div className={styles.materialGrid}>
        {materialStudies.map((study, index) => (
          <article key={study.kind} className={cn(styles.materialStudy, styles[`material_${study.kind}`])}>
            <span className={styles.studyNumber}>0{index + 1}</span>
            <div className={styles.studyMark} aria-hidden="true">
              {study.kind === "map" ? "⌖" : study.kind === "wood" ? "◆" : study.kind === "deck" ? "✦" : "§"}
            </div>
            <p>{study.eyebrow}</p>
            <h3>{study.title}</h3>
            <span>{study.copy}</span>
          </article>
        ))}
      </div>
      <WaxSeal mark="IV" className={styles.atelierSeal} tone="umber" />
      <ScrollEdge position="bottom" />
    </section>
  );
}
