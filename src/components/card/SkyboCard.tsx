import { CardRow } from '@/lib/db/cards-store';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { limitSigFigs } from '../utils';
import { SUIT_LABELS, VALUE_LABELS } from './card-opening';

const CARD_VARIANTS = {
  "RAINBOW": {
    id: "rainbow",
    shellClassName: "bg-[linear-gradient(135deg,#5ec8f8_0%,#4f7cff_18%,#6dd56d_36%,#ffe34d_58%,#ff8a5b_78%,#ef5da8_100%)]",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0,0 L30,10 L50,0 L80,15 L100,5 L120,20 L115,50 L120,80 L105,100 L120,120 L85,115 L60,120 L30,110 L0,120 L5,85 L0,55 L10,30 Z M30,10 L25,40 L0,55 M25,40 L55,35 L50,0 M55,35 L65,65 L10,75 L5,85 M10,30 L25,40 M65,65 L80,15 M65,65 L90,55 L100,5 M90,55 L115,50 M90,55 L105,80 L120,80 M105,80 L85,105 L85,115 M85,105 L60,85 L30,110 M60,85 L5,85 M60,85 L65,65 M85,105 L105,100' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")`,
    backgroundSize: '180px 180px',
  },
  "RED": {
    id: "red",
    shellClassName: "bg-[linear-gradient(180deg,#ff8d7a_0%,#ff6f61_52%,#ef4444_100%)]",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0,0 L30,10 L50,0 L80,15 L100,5 L120,20 L115,50 L120,80 L105,100 L120,120 L85,115 L60,120 L30,110 L0,120 L5,85 L0,55 L10,30 Z M30,10 L25,40 L0,55 M25,40 L55,35 L50,0 M55,35 L65,65 L10,75 L5,85 M10,30 L25,40 M65,65 L80,15 M65,65 L90,55 L100,5 M90,55 L115,50 M90,55 L105,80 L120,80 M105,80 L85,105 L85,115 M85,105 L60,85 L30,110 M60,85 L5,85 M60,85 L65,65 M85,105 L105,100' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")`,
    backgroundSize: '180px 180px',
  },
  "YELLOW": {
    id: "yellow",
    shellClassName: "bg-[linear-gradient(180deg,#fff3a3_0%,#ffe34d_45%,#facc15_100%)]",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0,0 L30,10 L50,0 L80,15 L100,5 L120,20 L115,50 L120,80 L105,100 L120,120 L85,115 L60,120 L30,110 L0,120 L5,85 L0,55 L10,30 Z M30,10 L25,40 L0,55 M25,40 L55,35 L50,0 M55,35 L65,65 L10,75 L5,85 M10,30 L25,40 M65,65 L80,15 M65,65 L90,55 L100,5 M90,55 L115,50 M90,55 L105,80 L120,80 M105,80 L85,105 L85,115 M85,105 L60,85 L30,110 M60,85 L5,85 M60,85 L65,65 M85,105 L105,100' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")`,
    backgroundSize: '180px 180px',
  },
  "LIGHT_BLUE": {
    id: "light-blue",
    shellClassName: "bg-[linear-gradient(180deg,#b8ecff_0%,#73d7ff_48%,#38bdf8_100%)]",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0,0 L30,10 L50,0 L80,15 L100,5 L120,20 L115,50 L120,80 L105,100 L120,120 L85,115 L60,120 L30,110 L0,120 L5,85 L0,55 L10,30 Z M30,10 L25,40 L0,55 M25,40 L55,35 L50,0 M55,35 L65,65 L10,75 L5,85 M10,30 L25,40 M65,65 L80,15 M65,65 L90,55 L100,5 M90,55 L115,50 M90,55 L105,80 L120,80 M105,80 L85,105 L85,115 M85,105 L60,85 L30,110 M60,85 L5,85 M60,85 L65,65 M85,105 L105,100' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")`,
    backgroundSize: '180px 180px',
  },
  "DARK_BLUE": {
    id: "dark-blue",
    shellClassName: "bg-[linear-gradient(180deg,#3658d6_0%,#2240a8_50%,#1e2f73_100%)]",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0,0 L30,10 L50,0 L80,15 L100,5 L120,20 L115,50 L120,80 L105,100 L120,120 L85,115 L60,120 L30,110 L0,120 L5,85 L0,55 L10,30 Z M30,10 L25,40 L0,55 M25,40 L55,35 L50,0 M55,35 L65,65 L10,75 L5,85 M10,30 L25,40 M65,65 L80,15 M65,65 L90,55 L100,5 M90,55 L115,50 M90,55 L105,80 L120,80 M105,80 L85,105 L85,115 M85,105 L60,85 L30,110 M60,85 L5,85 M60,85 L65,65 M85,105 L105,100' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")`,
    backgroundSize: '180px 180px',
  },
  "GREEN": {
    id: "green",
    shellClassName: "bg-[linear-gradient(180deg,#8fe06d_0%,#6dd56d_44%,#43b649_100%)]",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0,0 L30,10 L50,0 L80,15 L100,5 L120,20 L115,50 L120,80 L105,100 L120,120 L85,115 L60,120 L30,110 L0,120 L5,85 L0,55 L10,30 Z M30,10 L25,40 L0,55 M25,40 L55,35 L50,0 M55,35 L65,65 L10,75 L5,85 M10,30 L25,40 M65,65 L80,15 M65,65 L90,55 L100,5 M90,55 L115,50 M90,55 L105,80 L120,80 M105,80 L85,105 L85,115 M85,105 L60,85 L30,110 M60,85 L5,85 M60,85 L65,65 M85,105 L105,100' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")`,
    backgroundSize: '180px 180px',
  },
}

export function getCardVariant(card: CardRow) {
  if (card.modifier === "Holographic") return CARD_VARIANTS["RAINBOW"];
  if (card.value < 0) return CARD_VARIANTS["DARK_BLUE"];
  if (card.value === 0) return CARD_VARIANTS["LIGHT_BLUE"];
  if (card.value <= 4) return CARD_VARIANTS["GREEN"];
  if (card.value <= 8) return CARD_VARIANTS["YELLOW"];
  return CARD_VARIANTS["RED"];
}

interface SkyboCardProps {
  card: CardRow;
  className?: string;
  isFlippedByDefault?: boolean;
  onFlip?: (isFlipped: boolean) => void;
}

export default function SkyboCard({ 
  card,
  className,
  isFlippedByDefault = false,
  onFlip
}: SkyboCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFlipped, setIsFlipped] = useState(isFlippedByDefault);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glintX, setGlintX] = useState(50);
  const [glintY, setGlintY] = useState(50);
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const styling = getCardVariant(card);

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width - 0.5;
    const y = (clientY - rect.top) / rect.height - 0.5;
    
    // Invert the horizontal tracking logic if the card is flipped backwards
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

  // Base card face style shared between front and back
  const cardFaceBaseClass = "absolute inset-0 bg-gradient-to-br p-3 rounded-2xl border-4 border-white flex flex-col justify-between select-none overflow-hidden backface-hidden shadow-xl";

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
      className={cn("perspective-[1000px] w-44 h-60 aspect-5/7 inline-block cursor-pointer font-sans", className)}
    >
      {/* 3D Rotator Inner Wrapper */}
      <div 
        className="relative w-full h-full duration-500 ease-out rounded-2xl"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY + (isFlipped ? 180 : 0)}deg) ${isHovered ? 'scale(1.03)' : 'scale(1)'}`,
          transformStyle: 'preserve-3d',
          boxShadow: isHovered
            ? `${-rotateY * 1.5}px ${rotateX * 1.5}px 30px rgba(0,0,0,0.35), 0 20px 40px rgba(0,0,0,0.4)`
            : '0 10px 25px rgba(0,0,0,0.4)',
        }}
      >
        {/* Dynamic Glint Reflection (Shared Overlay layer to stay optimized) */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-color-dodge z-30"
          style={{
            opacity: isPressed ? 0.6 : isHovered ? 0.35 : 0,
            background: `radial-gradient(circle 120px at ${glintX}% ${glintY}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)`
          }}
        />

        {/* =========================================================================
            CARD FRONT
           ========================================================================= */}
        <div className={cn(cardFaceBaseClass, styling.shellClassName, "text-slate-900 font-extrabold")}>
          <div 
            className="absolute inset-0 opacity-[0.20] mix-blend-overlay"
            style={{
              backgroundImage: styling.backgroundImage,
              backgroundSize: styling.backgroundSize,
            }}
          />

          {/* Top Value */}
          <div className="self-start relative z-10 flex items-center justify-center min-w-[45px] min-h-[32px] text-xl font-bold text-slate-800 before:content-[''] before:absolute before:inset-0 before:bg-white before:rounded-[50%] before:-rotate-[33deg] before:-z-10">
            <span className={cn((card.value === 6 || card.value === 9) && "underline decoration-2 underline-offset-2")}>
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
              className={cn(`relative text-[100px] font-bold text-slate-800
                [text-shadow:2px_2px_0_#fff,-2px_2px_0_#fff,2px_-2px_0_#fff,-2px_-2px_0_#fff]
                before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2
                before:w-[180px] before:h-[180px] 
                before:bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(255,255,255,0.8)_30%,transparent_70%)] 
                before:-z-10 before:pointer-events-none`,
                (card.value === 6 || card.value === 9) && "underline decoration-6 underline-offset-8"
              )}
            >
              {card.value}
            </div>
          </div>

          {/* Bottom Value */}
          <div className="self-end relative z-10 flex items-center justify-center min-w-[45px] min-h-[32px] text-xl font-bold text-slate-800 rotate-180 before:content-[''] before:absolute before:inset-0 before:bg-white before:rounded-[50%] before:-rotate-[33deg] before:-z-10">
            <span className={cn((card.value === 6 || card.value === 9) && "underline decoration-2 underline-offset-2")}>
              {card.value}
            </span>
          </div>
        </div>

        {/* Back of card */}
        <div 
          className={cn(cardFaceBaseClass, "[transform:rotateY(180deg)] bg-white p-0 flex")}
        >
          <div className="relative h-2/3 bg-[conic-gradient(from_0deg,#5ec8f8_0deg,#4f7cff_65deg,#6dd56d_130deg,#ffe34d_209deg,#ff8a5b_281deg,#ef5da8_325deg,#5ec8f8_360deg)]">
            <div 
              className={`absolute inset-0 opacity-[0.22] mix-blend-overlay`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='97' viewBox='0 0 56 97'%3E%3Cpath d='M28 0 L56 16.16 V48.5 L28 64.66 L0 48.5 V16.16 Z M0 48.5 L28 32.34 L56 48.5 M0 16.16 L28 32.34 L56 16.16 M28 64.66 V97 M0 80.83 L28 97 L56 80.83' fill='none' stroke='%23ffffff' stroke-width='1.2' stroke-linejoin='round' stroke-linecap='round'/%3E%3C/svg%3E")`,
              }}
            />
              <div className="text-[40px] text-black absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 font-bold tracking-wider -rotate-22">
                SKYBO
              </div>
              <div className="text-[44px] absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 font-bold tracking-wider text-white -rotate-22">
                SKYBO
              </div>
          </div>
          <div className="flex flex-col tracking-tighter border rounded-b-xl mt-1 bg-slate-500/50 justify-center items-center relative h-1/3 text-xs text-white bg-[linear-gradient(180deg,#3658d6_0%,#2240a8_50%,#1e2f73_100%)]">
              <p>
                {card.modifier} {VALUE_LABELS[card.value]}
              </p>
              <p className="text-balance">
              {card.owner?.first_name} {card.owner?.last_name} - {new Date(card.created_at as string).toLocaleDateString("en-US", {
                  month: "2-digit",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p>
                {limitSigFigs(card.probability * 100, 5)}% probability
              </p>
          </div>
        </div>
      </div>
    </div>
  );
}