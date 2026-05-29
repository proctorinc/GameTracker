import Link from "next/link";
import { cn } from "@/lib/utils";
import { getInitials } from "../utils";
import type { UserBase } from "@/lib/db/store";
import { ReactNode } from "react";

interface ProfilePictureProps {
  user: Pick<UserBase, "id" | "firstName" | "lastName" | "color">;
  className?: string;
  content?: ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  linkToProfile?: boolean;
}

const sizeClasses = {
  xs: "w-8 h-8 rounded-md text-xs",
  sm: "w-10 h-10 rounded-lg",
  md: "w-16 h-16 text-xl rounded-2xl",
  lg: "w-24 h-24 text-3xl rounded-3xl",
  xl: "w-32 h-32 text-6xl rounded-4xl",
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

  const avatar = (
    <div
      className={cn(
        "relative shrink-0 select-none overflow-hidden font-black text-slate-950 shadow-md ring-1 ring-black/8 dark:ring-white/12 flex items-center justify-center",
        sizeClasses[size],
        linkToProfile && "transition-transform hover:scale-[1.03]",
        className,
      )}
      style={{ backgroundColor: user.color }}
    >
      <div className="absolute inset-0 opacity-[0.25] mix-blend-overlay pointer-events-none" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] dark:bg-[radial-gradient(circle,rgba(15,23,42,0.42)_0%,rgba(15,23,42,0.22)_50%,transparent_100%)]" />
      <div className="relative flex flex-col items-center justify-center line-height-none tracking-tight">
        {content}
        {!content && <span className="leading-none ">{initials}</span>}
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
