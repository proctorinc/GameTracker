import { cn } from '@/lib/utils';

interface CardBackProps {
  className?: string;
  isHovered?: boolean;
}

export default function CardBack({ 
  className,
}: CardBackProps) {
  return (
    <div className={cn("w-44 h-60 shrink-0 z-0 relative font-skybo", className)}>
      
      {/* 2. The Inner Box: Handles all visual styling, scaling, and hover states */}
      <div 
        className={cn(
          "w-full h-full rounded-2xl border-4 border-white flex flex-col select-none overflow-hidden shadow-xl bg-white p-0 font-sans transform transition-all duration-300 origin-center",
        )}
      >
        {/* Top Section: Conic Gradient Background with Pattern and Text Overlay */}
        <div className="relative h-1/2 bg-[conic-gradient(from_0deg,#5ec8f8_0deg,#4f7cff_65deg,#6dd56d_130deg,#ffe34d_209deg,#ff8a5b_281deg,#ef5da8_325deg,#5ec8f8_360deg)]">
            <div 
            className="absolute inset-0 opacity-[0.22] mix-blend-overlay"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='97' viewBox='0 0 56 97'%3E%3Cpath d='M28 0 L56 16.16 V48.5 L28 64.66 L0 48.5 V16.16 Z M0 48.5 L28 32.34 L56 48.5 M0 16.16 L28 32.34 L56 16.16 M28 64.66 V97 M0 80.83 L28 97 L56 80.83' fill='none' stroke='%23ffffff' stroke-width='1.2' stroke-linejoin='round' stroke-linecap='round'/%3E%3C/svg%3E")`,
            }}
            />
            <div className="text-[40px] text-black absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 font-bold tracking-wider -rotate-22 select-none">
                SKYBO
            </div>
            <div className="text-[44px] absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 font-bold tracking-wider text-white -rotate-22 select-none">
                SKYBO
            </div>
        </div>

        <div className="relative h-1/2 bg-[conic-gradient(from_0deg,#5ec8f8_0deg,#4f7cff_65deg,#6dd56d_130deg,#ffe34d_209deg,#ff8a5b_281deg,#ef5da8_325deg,#5ec8f8_360deg)] rotate-180">
            <div 
            className="absolute inset-0 opacity-[0.22] mix-blend-overlay"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='97' viewBox='0 0 56 97'%3E%3Cpath d='M28 0 L56 16.16 V48.5 L28 64.66 L0 48.5 V16.16 Z M0 48.5 L28 32.34 L56 48.5 M0 16.16 L28 32.34 L56 16.16 M28 64.66 V97 M0 80.83 L28 97 L56 80.83' fill='none' stroke='%23ffffff' stroke-width='1.2' stroke-linejoin='round' stroke-linecap='round'/%3E%3C/svg%3E")`,
            }}
            />
            <div className="text-[40px] text-black absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 font-bold tracking-wider -rotate-22 select-none">
                SKYBO
            </div>
            <div className="text-[44px] absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 font-bold tracking-wider text-white -rotate-22 select-none">
                SKYBO
            </div>
        </div>
      </div>
    </div>
  );
}