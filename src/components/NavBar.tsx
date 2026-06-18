"use client";

import { useState } from "react";
import { AudioLines, Dices, User2, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/activity",
    label: "Activity",
    icon: AudioLines,
    matches: (pathname: string) => pathname.startsWith("/activity"),
  },
  {
    href: "/dashboard",
    label: "Play",
    icon: Dices,
    matches: (pathname: string) => pathname === "/dashboard",
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User2,
    matches: (pathname: string) => pathname.startsWith("/profile"),
  },
] as const;

type NavBarProps = {
  hasPendingFriendInvitations?: boolean;
};

export default function NavBar({
  hasPendingFriendInvitations = false,
}: NavBarProps) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const hasPendingNavigation = pendingHref !== null && pendingHref !== pathname;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6">
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-50 h-1 origin-left bg-primary/80 shadow-[0_0_18px_rgba(15,23,42,0.18)] transition-transform duration-200 ease-out",
          hasPendingNavigation ? "scale-x-100" : "scale-x-0",
        )}
      />
      <div className="mx-auto w-full max-w-md rounded-[2rem] border border-border/80 bg-card/20 p-3 text-card-foreground shadow-[0_-14px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:shadow-[0_-18px_50px_rgba(2,6,23,0.45)]">
        <div className="flex justify-between gap-2">
          {navItems.map(({ href, label, icon: Icon, matches }) => {
            const isActive = matches(pathname);
            const isPending = pendingHref === href && !isActive;
            const showInviteIndicator =
              href === "/profile" && hasPendingFriendInvitations;

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                aria-busy={isPending || undefined}
                prefetch
                onClick={() => {
                  if (!isActive) {
                    setPendingHref(href);
                  }
                }}
                className={cn(
                  "relative flex h-16 w-20 flex-col items-center justify-center gap-1 rounded-[1.4rem] border px-4 text-[0.68rem] font-semibold tracking-[0.08em] uppercase transition-[transform,colors,opacity] duration-200",
                  isActive
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                  isPending && "scale-[0.98] opacity-70",
                )}
              >
                {showInviteIndicator ? (
                  <span className="absolute right-3 top-3 size-2.5 rounded-full bg-red-500" />
                ) : null}
                <Icon className="size-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
