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
        "relative isolate shrink-0 select-none overflow-hidden rounded-full flex items-center justify-center ring-1 ring-slate-900/6 dark:ring-white/12",
        sizeClasses[size],
        linkToProfile && "transition-transform hover:scale-[1.03]",
        className,
      )}
      style={avatarStyles}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,var(--profile-surface-highlight)_0%,transparent_58%)] dark:bg-[radial-gradient(circle_at_30%_28%,rgba(15,23,42,0.18)_0%,transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_100%)]" />

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
      <div className="relative flex flex-col items-center justify-center leading-none">
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
