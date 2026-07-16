"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { acknowledgeAnnouncementAction } from "@/app/actions/announcements";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AnnouncementForClient } from "@/lib/db/store/announcement.store";

export function AnnouncementModal({
  announcements,
}: {
  announcements: AnnouncementForClient[];
}) {
  const pathname = usePathname();
  const [locallyAcknowledgedIds, setLocallyAcknowledgedIds] = useState<
    Set<string>
  >(() => new Set());
  const [navigation, setNavigation] = useState<{
    announcement: AnnouncementForClient;
    originPathname: string;
  } | null>(null);
  const visibleAnnouncements = useMemo(
    () => {
      if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        return [];
      }

      if (navigation && pathname === navigation.originPathname) {
        return [navigation.announcement];
      }

      const isActionDestination = announcements.some((announcement) => {
        if (!announcement.actionHref) return false;

        try {
          const destination = new URL(
            announcement.actionHref,
            "https://scoreloser.local",
          );
          return destination.pathname === pathname;
        } catch {
          return false;
        }
      });

      return isActionDestination
        ? []
        : announcements.filter(
            (announcement) => !locallyAcknowledgedIds.has(announcement.id),
          );
    },
    [announcements, locallyAcknowledgedIds, navigation, pathname],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(visibleAnnouncements.length > 0);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const router = useRouter();
  const current = visibleAnnouncements[currentIndex];
  const isNavigating = navigation !== null;

  useEffect(() => {
    if (!navigation || pathname === navigation.originPathname) return;

    const timeoutId = window.setTimeout(() => setNavigation(null), 0);
    return () => window.clearTimeout(timeoutId);
  }, [navigation, pathname]);

  if (!current) {
    return null;
  }

  const isLast = currentIndex === visibleAnnouncements.length - 1;

  function acknowledgeCurrent() {
    setIsAcknowledging(true);
    void (async () => {
      try {
        await acknowledgeAnnouncementAction({ announcementId: current.id });
        setLocallyAcknowledgedIds((ids) => new Set(ids).add(current.id));
        if (isLast) {
          setOpen(false);
        } else {
          setCurrentIndex(0);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not acknowledge announcement",
        );
      } finally {
        setIsAcknowledging(false);
      }
    })();
  }

  function followAction() {
    const destination = current.actionHref;
    if (!destination) return;

    setCurrentIndex(0);
    setNavigation({ announcement: current, originPathname: pathname });
    void (async () => {
      try {
        await acknowledgeAnnouncementAction({ announcementId: current.id });
        setLocallyAcknowledgedIds((ids) => new Set(ids).add(current.id));
        router.push(destination);
      } catch (error) {
        setNavigation(null);
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not acknowledge announcement",
        );
      }
    })();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isNavigating) setOpen(nextOpen);
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 sm:max-w-xl"
        showCloseButton={!isNavigating}
      >
        {current.screenshotUrl ? (
          <img
            alt={`${current.title} announcement screenshot`}
            className="max-h-[45dvh] w-full rounded-t-xl border-b object-contain bg-muted/40"
            src={current.screenshotUrl}
          />
        ) : null}
        <DialogHeader className="px-5 pt-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What&apos;s new · {currentIndex + 1} of {visibleAnnouncements.length}
          </div>
          <DialogTitle className="pr-10 text-2xl font-black leading-tight">
            {current.title}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-wrap text-sm leading-6 text-foreground/80">
            {current.details}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {current.actionLabel && current.actionHref ? (
            <Button
              disabled={isAcknowledging || isNavigating}
              onClick={followAction}
              type="button"
            >
              {isNavigating ? <LoaderCircle className="animate-spin" /> : null}
              {isNavigating ? "Opening…" : current.actionLabel}
            </Button>
          ) : null}
          <Button
            disabled={isAcknowledging || isNavigating}
            onClick={acknowledgeCurrent}
            type="button"
            variant={current.actionLabel && current.actionHref ? "outline" : "default"}
          >
            {isAcknowledging && !isNavigating ? <LoaderCircle className="animate-spin" /> : null}
            {isLast ? "Got it" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
