"use client";

import { PROFILE_COLORS } from "@/lib/profile-colors";
import { cn } from "@/lib/utils";

export { PROFILE_COLORS };

interface ProfileColorSelectorProps {
  color: string;
  onSelect: (color: string) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  description?: string;
  hidePreview?: boolean;
  options?: readonly string[];
}

export function ProfileColorSelector({
  color,
  onSelect,
  disabled = false,
  className,
  title = "Profile color",
  description = "Choose a color for your profile badge",
  hidePreview,
  options = PROFILE_COLORS,
}: ProfileColorSelectorProps) {
  return (
    <div className={cn("grid gap-4", className)}>
      {!hidePreview && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 p-3">
          <span
            className="h-10 w-10 rounded-xl shadow-sm ring-1 ring-slate-900/8 dark:ring-white/12"
            style={{ backgroundColor: color }}
          />
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-6 gap-2">
        {options.map((option) => {
          const isSelected = option === color;

          return (
            <button
              key={option}
              type="button"
              aria-label={`Choose color ${option}`}
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => onSelect(option)}
              className={cn(
                "h-9 w-9 rounded-xl border-2 transition-transform hover:scale-105",
                isSelected
                  ? "border-foreground ring-2 ring-ring/30 shadow-sm"
                  : "border-transparent shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
                disabled && "cursor-wait opacity-70",
              )}
              style={{ backgroundColor: option }}
            />
          );
        })}
      </div>
    </div>
  );
}
