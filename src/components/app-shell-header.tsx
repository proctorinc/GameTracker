"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { APP_NAME } from "@/lib/app-config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const BACK_BUTTON_RULES = [
  {
    matches: (pathname: string) => pathname === "/admin",
    fallbackHref: "/profile",
  },
  {
    matches: (pathname: string) => pathname === "/admin/ranks",
    fallbackHref: "/admin",
  },
  {
    matches: (pathname: string) => pathname === "/card/pull",
    fallbackHref: "/profile",
  },
  {
    matches: (pathname: string) => pathname === "/game/create/settings",
    fallbackHref: "/dashboard",
  },
  {
    matches: (pathname: string) => pathname === "/game/history",
    fallbackHref: "/dashboard",
  },
  {
    matches: (pathname: string) => pathname === "/player-rank",
    fallbackHref: "/activity",
  },
  {
    matches: (pathname: string) => /^\/profile\/[^/]+$/.test(pathname),
    fallbackHref: "/profile",
  },
  {
    matches: (pathname: string) => pathname === "/titles",
    fallbackHref: "/dashboard",
  },
  {
    matches: (pathname: string) => /^\/titles\/[^/]+$/.test(pathname),
    fallbackHref: "/titles",
  },
  {
    matches: (pathname: string) => /^\/game\/[^/]+\/play$/.test(pathname),
    fallbackHref: "/dashboard",
  },
  {
    matches: (pathname: string) => /^\/game\/[^/]+\/settings$/.test(pathname),
    fallbackHref: (pathname: string) =>
      pathname.replace(/\/settings$/, "/play"),
  },
] as const;

function getFallbackHref(pathname: string) {
  const fallbackHref =
    BACK_BUTTON_RULES.find((rule) => rule.matches(pathname))?.fallbackHref ??
    null;

  if (typeof fallbackHref === "function") {
    return fallbackHref(pathname);
  }

  return fallbackHref;
}

function shouldAlwaysUseFallback(pathname: string) {
  return /^\/game\/[^/]+\/play$/.test(pathname);
}

export default function AppShellHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const fallbackHref = getFallbackHref(pathname);
  const [isPending, startTransition] = useTransition();
  const [isGoingBack, setIsGoingBack] = useState(false);

  useEffect(() => {
    setIsGoingBack(false);
  }, [pathname]);

  function handleBack() {
    if (!fallbackHref || isPending) {
      return;
    }

    setIsGoingBack(true);
    startTransition(() => {
      if (typeof window === "undefined") {
        router.push(fallbackHref);
        return;
      }

      if (shouldAlwaysUseFallback(pathname)) {
        router.push(fallbackHref);
        return;
      }

      const hasSameOriginReferrer =
        document.referrer !== "" &&
        new URL(document.referrer).origin === window.location.origin;

      if (window.history.length > 1 && hasSameOriginReferrer) {
        router.back();
        return;
      }

      router.push(fallbackHref);
    });
  }

  return (
    <header className="pt-[env(safe-area-inset-top,0px)]">
      <div className="relative flex h-16 w-full items-center justify-center px-4 text-center">
        {fallbackHref ? (
          <Button
            aria-label="Go back"
            className="absolute left-4 top-1/2 size-10 -translate-y-1/2 rounded-full px-0 active:translate-y-0"
            disabled={isPending}
            onClick={handleBack}
            size="icon"
            type="button"
            variant="ghost"
          >
            {isGoingBack ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <ArrowLeft className="size-5" />
            )}
          </Button>
        ) : null}
        <Link
          href="/dashboard"
          aria-label={`${APP_NAME} home`}
          className={cn(
            "group flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-foreground transition-transform transition-colors hover:scale-[1.01] hover:border-border/40 dark:border-white/20 backdrop-blur-sm",
            fallbackHref ? "scale-75" : "scale-75",
          )}
        >
          <Image
            src="/score-loser.png"
            alt={`${APP_NAME} logo`}
            width={24}
            height={24}
            className="size-6 object-contain"
            unoptimized
          />
          <span className="font-bold font-logo tracking-[0.18em]">
            {APP_NAME}
          </span>
        </Link>
      </div>
    </header>
  );
}
