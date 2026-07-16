import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import CardBack from './CardBack';

export const BACKGROUND_STYLES = {
  rainbow: {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0,0 L30,10 L50,0 L80,15 L100,5 L120,20 L115,50 L120,80 L105,100 L120,120 L85,115 L60,120 L30,110 L0,120 L5,85 L0,55 L10,30 Z M30,10 L25,40 L0,55 M25,40 L55,35 L50,0 M55,35 L65,65 L10,75 L5,85 M10,30 L25,40 M65,65 L80,15 M65,65 L90,55 L100,5 M90,55 L115,50 M90,55 L105,80 L120,80 M105,80 L85,105 L85,115 M85,105 L60,85 L30,110 M60,85 L5,85 M60,85 L65,65 M85,105 L105,100' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")`,
    backgroundSize: '180px 180px',
  },
  red: {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0,0 L30,10 L50,0 L80,15 L100,5 L120,20 L115,50 L120,80 L105,100 L120,120 L85,115 L60,120 L30,110 L0,120 L5,85 L0,55 L10,30 Z M30,10 L25,40 L0,55 M25,40 L55,35 L50,0 M55,35 L65,65 L10,75 L5,85 M10,30 L25,40 M65,65 L80,15 M65,65 L90,55 L100,5 M90,55 L115,50 M90,55 L105,80 L120,80 M105,80 L85,105 L85,115 M85,105 L60,85 L30,110 M60,85 L5,85 M60,85 L65,65 M85,105 L105,100' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")`,
    backgroundSize: '180px 180px',
  },
  yellow: {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0,0 L30,10 L50,0 L80,15 L100,5 L120,20 L115,50 L120,80 L105,100 L120,120 L85,115 L60,120 L30,110 L0,120 L5,85 L0,55 L10,30 Z M30,10 L25,40 L0,55 M25,40 L55,35 L50,0 M55,35 L65,65 L10,75 L5,85 M10,30 L25,40 M65,65 L80,15 M65,65 L90,55 L100,5 M90,55 L115,50 M90,55 L105,80 L120,80 M105,80 L85,105 L85,115 M85,105 L60,85 L30,110 M60,85 L5,85 M60,85 L65,65 M85,105 L105,100' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")`,
    backgroundSize: '180px 180px',
  },
  'light-blue': {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0,0 L30,10 L50,0 L80,15 L100,5 L120,20 L115,50 L120,80 L105,100 L120,120 L85,115 L60,120 L30,110 L0,120 L5,85 L0,55 L10,30 Z M30,10 L25,40 L0,55 M25,40 L55,35 L50,0 M55,35 L65,65 L10,75 L5,85 M10,30 L25,40 M65,65 L80,15 M65,65 L90,55 L100,5 M90,55 L115,50 M90,55 L105,80 L120,80 M105,80 L85,105 L85,115 M85,105 L60,85 L30,110 M60,85 L5,85 M60,85 L65,65 M85,105 L105,100' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")`,
    backgroundSize: '180px 180px',
  },
  'dark-blue': {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0,0 L30,10 L50,0 L80,15 L100,5 L120,20 L115,50 L120,80 L105,100 L120,120 L85,115 L60,120 L30,110 L0,120 L5,85 L0,55 L10,30 Z M30,10 L25,40 L0,55 M25,40 L55,35 L50,0 M55,35 L65,65 L10,75 L5,85 M10,30 L25,40 M65,65 L80,15 M65,65 L90,55 L100,5 M90,55 L115,50 M90,55 L105,80 L120,80 M105,80 L85,105 L85,115 M85,105 L60,85 L30,110 M60,85 L5,85 M60,85 L65,65 M85,105 L105,100' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")`,
    backgroundSize: '180px 180px',
  },
  green: {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0,0 L30,10 L50,0 L80,15 L100,5 L120,20 L115,50 L120,80 L105,100 L120,120 L85,115 L60,120 L30,110 L0,120 L5,85 L0,55 L10,30 Z M30,10 L25,40 L0,55 M25,40 L55,35 L50,0 M55,35 L65,65 L10,75 L5,85 M10,30 L25,40 M65,65 L80,15 M65,65 L90,55 L100,5 M90,55 L115,50 M90,55 L105,80 L120,80 M105,80 L85,105 L85,115 M85,105 L60,85 L30,110 M60,85 L5,85 M60,85 L65,65 M85,105 L105,100' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")`,
    backgroundSize: '180px 180px',
  },
  empty: {
    backgroundImage: "",
    backgroundSize: "",
  }
} as const;

type CardStyleVariant = keyof typeof BACKGROUND_STYLES;

export const cardVariants = cva(
  "absolute inset-0 bg-gradient-to-br p-3 rounded-xl border-4 border-white flex flex-col justify-between select-none overflow-hidden backface-hidden shadow-xl text-slate-900 font-extrabold",
  {
    variants: {
      cardStyle: {
        rainbow: "bg-[linear-gradient(135deg,#5ec8f8_0%,#4f7cff_18%,#6dd56d_36%,#ffe34d_58%,#ff8a5b_78%,#ef5da8_100%)]",
        red: "bg-[linear-gradient(180deg,#ff8d7a_0%,#ff6f61_52%,#ef4444_100%)]",
        yellow: "bg-[linear-gradient(180deg,#fff3a3_0%,#ffe34d_45%,#facc15_100%)]",
        'light-blue': "bg-[linear-gradient(180deg,#b8ecff_0%,#73d7ff_48%,#38bdf8_100%)]",
        'dark-blue': "bg-[linear-gradient(180deg,#3658d6_0%,#2240a8_50%,#1e2f73_100%)]",
        green: "bg-[linear-gradient(180deg,#8fe06d_0%,#6dd56d_44%,#43b649_100%)]",
        empty: "bg-black"
      }
    },
    defaultVariants: {
      cardStyle: "empty"
    }
  }
);

export type SkyboVisualCard = { value: number; modifier?: string };

export function determineCardStyle(card: SkyboVisualCard): CardStyleVariant {
  if (card.modifier === "Holographic") return "rainbow";
  if (card.value < 0) return "dark-blue";
  if (card.value === 0) return "light-blue";
  if (card.value <= 4) return "green";
  if (card.value <= 8) return "yellow";
  return "red";
}

interface SkyboCardProps extends VariantProps<typeof cardVariants> {
  card: SkyboVisualCard;
  className?: string;
  isFlippedByDefault?: boolean;
  onFlip?: (isFlipped: boolean) => void;
}

export default function SkyboCard({ 
  card,
  className,
  isFlippedByDefault = false,
  onFlip,
  cardStyle // Optional override prop if you want to hardcode styles elsewhere
}: SkyboCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFlipped, setIsFlipped] = useState(isFlippedByDefault);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glintX, setGlintX] = useState(50);
  const [glintY, setGlintY] = useState(50);
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Compute the current active style (uses passed prop fallback to dynamic checking)
  const activeStyle = cardStyle || determineCardStyle(card);
  const bgStyling = BACKGROUND_STYLES[activeStyle];

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width - 0.5;
    const y = (clientY - rect.top) / rect.height - 0.5;
    
    const multiplierY = isFlipped ? -30 : 30;
    
    setRotateX(-y * 30); 
    setRotateY(x * multiplierY);
    setGlintX(((clientX - rect.left) / rect.width) * 100);
    setGlintY(((clientY - rect.top) / rect.height) * 100);
  };

  const resetCard = () => {
    setRotateX(0);
    setRotateY(0);
    setIsPressed(false);
    setIsHovered(false);
  };

  const handleCardClick = () => {
    const nextFlipState = !isFlipped;
    setIsFlipped(nextFlipState);
    if (onFlip) onFlip(nextFlipState);
  };

  const isUnderlined = card.value === 6 || card.value === 9;

  return (
    <div 
      ref={containerRef}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
      onMouseLeave={resetCard}
      onTouchStart={() => { setIsHovered(true); setIsPressed(true); }}
      onTouchMove={(e) => {
        if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onTouchEnd={resetCard}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      className={cn("perspective-[1000px] w-44 h-60 aspect-5/7 inline-block cursor-pointer font-skybo", className)}
    >
      <div 
        className="relative w-full h-full duration-500 ease-out rounded-xl"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY + (isFlipped ? 180 : 0)}deg) ${isHovered ? 'scale(1.03)' : 'scale(1)'}`,
          transformStyle: 'preserve-3d',
          boxShadow: isHovered
            ? `${-rotateY * 1.5}px ${rotateX * 1.5}px 30px rgba(0,0,0,0.35), 0 20px 40px rgba(0,0,0,0.4)`
            : '0 10px 25px rgba(0,0,0,0.4)',
        }}
      >
        {/* Dynamic Glint Reflection */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-color-dodge z-30"
          style={{
            opacity: isPressed ? 0.6 : isHovered ? 0.35 : 0,
            background: `radial-gradient(circle 120px at ${glintX}% ${glintY}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)`
          }}
        />

        {/* =========================================================================
            CARD FRONT (Refactored using CVA classes)
           ========================================================================= */}
        <div className={cardVariants({ 
          cardStyle: activeStyle
          })}>
          <div 
            className="absolute inset-0 opacity-[0.20] mix-blend-overlay"
            style={bgStyling}
          />

          {/* Top Value */}
          <div className="self-start relative z-10 flex items-center justify-center min-w-[45px] min-h-[32px] text-xl font-bold text-slate-800 before:content-[''] before:absolute before:inset-0 before:bg-white before:rounded-[50%] before:-rotate-[33deg] before:-z-10">
            <span className={cn(isUnderlined && "underline decoration-2 underline-offset-2")}>
              {card.value}
            </span>
          </div>

          {/* Center Large Value */}
          <div 
            className="absolute inset-0 flex items-center justify-center z-10 transition-transform duration-200"
            style={{ 
              transform: isHovered && !isFlipped ? 'translateZ(40px)' : 'translateZ(0px)',
              transformStyle: 'preserve-3d'
            }}
          >
            <div 
              className={cn(
                `font-skybo relative text-[100px] font-bold text-slate-800
                [text-shadow:2px_2px_0_#fff,-2px_2px_0_#fff,2px_-2px_0_#fff,-2px_-2px_0_#fff]
                before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2
                before:w-[180px] before:h-[180px] 
                before:bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(255,255,255,0.8)_30%,transparent_70%)] 
                before:-z-10 before:pointer-events-none`,
                isUnderlined && "underline decoration-6 underline-offset-8"
              )}
            >
              {card.value}
            </div>
          </div>

          {/* Bottom Value */}
          <div className="self-end relative z-10 flex items-center justify-center min-w-[45px] min-h-[32px] text-xl font-bold text-slate-800 rotate-180 before:content-[''] before:absolute before:inset-0 before:bg-white before:rounded-[50%] before:-rotate-[33deg] before:-z-10">
            <span className={cn(isUnderlined && "underline decoration-2 underline-offset-2")}>
              {card.value}
            </span>
          </div>
        </div>

        {/* CARD BACK */}
        <div className="absolute inset-0 p-0 flex [transform:rotateY(180deg)] border-0 bg-white backface-hidden rounded-xl shadow-xl">
          <CardBack />
        </div>
      </div>
    </div>
  );
}
