"use client";

import {
  getProfileBackgroundUrl,
  PROFILE_BACKGROUND_URLS,
} from "@/lib/profile-backgrounds";
import { cn } from "@/lib/utils";
import ProfilePicture from "./profile-picture";

interface ProfileBackgroundSelectorProps {
  avatarUrl: string | null;
  color: string;
  firstName: string | null;
  lastName: string | null;
  onSelect: (avatarUrl: string | null) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  description?: string;
  hidePreview?: boolean;
}

export function ProfileBackgroundSelector({
  avatarUrl,
  color,
  firstName,
  lastName,
  onSelect,
  disabled = false,
  className,
  title = "Profile background",
  description = "Choose the pattern behind your profile badge",
  hidePreview = false,
}: ProfileBackgroundSelectorProps) {
  const selectedBackgroundUrl = getProfileBackgroundUrl(avatarUrl);

  return (
    <div className={cn("grid gap-4", className)}>
      {!hidePreview ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-3 py-2.5">
          <ProfilePicture
            className="h-10 w-10 text-sm"
            user={{
              id: "profile-background-preview",
              firstName,
              lastName,
              color,
              avatarUrl: selectedBackgroundUrl,
            }}
          />
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          aria-label="Choose no background"
          aria-pressed={selectedBackgroundUrl === null}
          disabled={disabled}
          onClick={() => onSelect(null)}
          className={cn(
            "flex aspect-square items-center justify-center overflow-hidden rounded-xl border-2 p-0.5 transition-transform hover:scale-[1.02]",
            selectedBackgroundUrl === null
              ? "border-foreground ring-2 ring-ring/30 shadow-sm"
              : "border-transparent shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
            disabled && "cursor-wait opacity-70",
          )}
        >
          <ProfilePicture
            size="xl"
            className="h-[calc(100%-0.125rem)] w-[calc(100%-0.125rem)] text-3xl shadow-sm"
            content={<span aria-hidden="true" />}
            user={{
              id: "no-profile-background",
              firstName,
              lastName,
              color,
              avatarUrl: null,
            }}
          />
        </button>
        {PROFILE_BACKGROUND_URLS.map((option) => {
          const isSelected = option === selectedBackgroundUrl;

          return (
            <button
              key={option}
              type="button"
              aria-label={`Choose background ${option.split("/").pop()}`}
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => onSelect(option)}
              className={cn(
                "flex aspect-square items-center justify-center overflow-hidden rounded-xl border-2 p-0.5 transition-transform hover:scale-[1.02]",
                isSelected
                  ? "border-foreground ring-2 ring-ring/30 shadow-sm"
                  : "border-transparent shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
                disabled && "cursor-wait opacity-70",
              )}
            >
              <ProfilePicture
                size="xl"
                className="h-[calc(100%-0.125rem)] w-[calc(100%-0.125rem)] text-3xl shadow-sm"
                content={<span aria-hidden="true" />}
                user={{
                  id: option,
                  firstName,
                  lastName,
                  color,
                  avatarUrl: option,
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
