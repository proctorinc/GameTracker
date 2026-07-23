import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "../utils";
import type { UserBase } from "@/lib/db/store";
import { getProfileColorSurfaceStyles } from "./profile-color-styles";
import Image from "next/image";
import { getProfileBackgroundUrl } from "@/lib/profile-backgrounds";

interface ProfilePictureProps {
  user: Pick<UserBase, "id" | "firstName" | "lastName" | "color"> & {
    avatarUrl: string | null;
  };
  className?: string;
  content?: ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  linkToProfile?: boolean;
}

const sizeClasses = {
  xs: "w-8 h-8 text-xs",
  sm: "w-10 h-10 text-sm",
  md: "w-16 h-16 text-2xl",
  lg: "w-24 h-24 text-4xl",
  xl: "w-32 h-32 text-5xl",
};

export default function ProfilePicture({
  user,
  className,
  content,
  size = "md",
  linkToProfile = false,
}: ProfilePictureProps) {
  const initials = getInitials(user);
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || "User";
  const avatarStyles = getProfileColorSurfaceStyles(user.color);
  const backgroundImageUrl = user.avatarUrl
    ? getProfileBackgroundUrl(user.avatarUrl)
    : null;

  const avatar = (
    <div
      className={cn(
        "group/profile-picture relative isolate flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-900/8 dark:ring-white/16",
        sizeClasses[size],
        linkToProfile && "transition-transform hover:scale-[1.03]",
        className,
      )}
      style={{
        ...avatarStyles,
        boxShadow:
          "0 12px 25px -13px var(--profile-surface-glow), 0 0 16px -6px var(--profile-surface-glow), inset 0 1px 0 rgba(255,255,255,0.58), inset 0 -5px 12px rgba(15,23,42,0.12)",
      }}
    >
      {backgroundImageUrl && (
        <Image
          className="absolute h-full w-full opacity-10"
          alt=""
          aria-hidden="true"
          src={backgroundImageUrl}
          fill
          sizes="(max-width: 640px) 128px, 128px"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(255,255,255,0.56)_0%,var(--profile-surface-highlight)_18%,transparent_48%)] dark:bg-[radial-gradient(circle_at_28%_20%,rgba(255,255,255,0.38)_0%,var(--profile-surface-highlight)_20%,transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,transparent_43%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_42%,rgba(15,23,42,0.24)_100%)]" />
      <div
        className="pointer-events-none absolute -inset-x-1/2 -inset-y-1/4 translate-x-[-34%] rotate-12 bg-[linear-gradient(112deg,transparent_38%,rgba(255,255,255,0.04)_43%,rgba(255,255,255,0.38)_48%,rgba(255,255,255,0.08)_52%,transparent_58%)] opacity-70 mix-blend-screen transition-transform duration-700 ease-out group-hover/profile-picture:translate-x-[34%] motion-reduce:transition-none"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-[1px] rounded-full border border-white/35 shadow-[inset_0_0_8px_rgba(255,255,255,0.14)] dark:border-white/25" />
      <div className="relative z-10 flex flex-col items-center justify-center leading-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.12)]">
        {content}
        {!content && (
          <span className="leading-none font-black uppercase">{initials}</span>
        )}
      </div>
    </div>
  );

  if (linkToProfile) {
    return (
      <Link
        href={`/profile/${user.id}`}
        aria-label={`View ${displayName}'s profile`}
        className="inline-block"
      >
        {avatar}
      </Link>
    );
  }

  return avatar;
}
