import { cn } from '@/lib/utils';
import { BACKGROUND_STYLES, cardVariants, determineCardStyle, type SkyboVisualCard } from './SkyboCard';

interface StaticSkyboCardProps {
  card: SkyboVisualCard;
  className?: string;
  /** Optional override to force a specific color theme */
  cardStyle?: keyof typeof BACKGROUND_STYLES;
}

export default function StaticSkyboCard({ 
  card,
  className,
  cardStyle 
}: StaticSkyboCardProps) {
  // Compute styling statically based on your existing card game-logic rules
  const activeStyle = cardStyle || determineCardStyle(card);
  const bgStyling = BACKGROUND_STYLES[activeStyle];

  const isUnderlined = card.value === 6 || card.value === 9;

  return (
    <div className={cn("w-44 h-60 aspect-5/7 inline-block font-sans relative", className)}>
      <div 
        className={cn(
          cardVariants({ cardStyle: activeStyle }),
          // Explicitly remove absolute layout overrides that the 3D flipper relies on
          "position-static w-full h-full transform-none shadow-lg"
        )}
      >
        {/* SVG Vector Background Layer */}
        <div 
          className="absolute inset-0 opacity-[0.20] mix-blend-overlay pointer-events-none"
          style={bgStyling}
        />

        {/* Top Corner Value */}
        <div className="self-start relative z-10 flex items-center justify-center min-w-[45px] min-h-[32px] text-xl font-bold text-slate-800 before:content-[''] before:absolute before:inset-0 before:bg-white before:rounded-[50%] before:-rotate-[33deg] before:-z-10">
          <span className={cn(isUnderlined && "underline decoration-2 underline-offset-2")}>
            {card.value}
          </span>
        </div>

        {/* Center Large Value */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div 
            className={cn(
              `relative text-[100px] font-bold text-slate-800
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

        {/* Bottom Corner Value (Inverted) */}
        <div className="self-end relative z-10 flex items-center justify-center min-w-[45px] min-h-[32px] text-xl font-bold text-slate-800 rotate-180 before:content-[''] before:absolute before:inset-0 before:bg-white before:rounded-[50%] before:-rotate-[33deg] before:-z-10">
          <span className={cn(isUnderlined && "underline decoration-2 underline-offset-2")}>
            {card.value}
          </span>
        </div>
      </div>
    </div>
  );
}
