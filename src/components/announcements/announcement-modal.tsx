"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(announcements.length > 0);
  const [isPending, startTransition] = useTransition();
  const current = announcements[currentIndex];

  if (!current) {
    return null;
  }

  const isLast = currentIndex === announcements.length - 1;

  function acknowledgeCurrent() {
    startTransition(async () => {
      try {
        await acknowledgeAnnouncementAction({ announcementId: current.id });
        if (isLast) {
          setOpen(false);
        } else {
          setCurrentIndex((index) => index + 1);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not acknowledge announcement",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 sm:max-w-xl">
        {current.screenshotUrl ? (
          <img
            alt={`${current.title} announcement screenshot`}
            className="max-h-[45dvh] w-full rounded-t-xl border-b object-contain bg-muted/40"
            src={current.screenshotUrl}
          />
        ) : null}
        <DialogHeader className="px-5 pt-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What&apos;s new · {currentIndex + 1} of {announcements.length}
          </div>
          <DialogTitle className="pr-10 text-2xl font-black leading-tight">
            {current.title}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-wrap text-sm leading-6 text-foreground/80">
            {current.details}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={isPending} onClick={acknowledgeCurrent} type="button">
            {isPending ? <LoaderCircle className="animate-spin" /> : null}
            {isLast ? "Got it" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
