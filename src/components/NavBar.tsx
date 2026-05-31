"use client";

import { Dices, Home, User2, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/friends",
    label: "Friends",
    icon: Users,
    matches: (pathname: string) => pathname.startsWith("/friends"),
  },
  {
    href: "/dashboard",
    label: "Games",
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

export default function NavBar() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-[2rem] border border-border/80 bg-card/20 p-3 text-card-foreground shadow-[0_-14px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:shadow-[0_-18px_50px_rgba(2,6,23,0.45)]">
        <div className="flex justify-between gap-2">
          {navItems.map(({ href, label, icon: Icon, matches }) => {
            const isActive = matches(pathname);

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col w-fit px-4 items-center justify-center gap-1 rounded-[1.4rem] border text-[0.68rem] font-semibold tracking-[0.08em] uppercase transition-colors",
                  isActive
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
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
