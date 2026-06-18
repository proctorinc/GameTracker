"use client";

import { useMemo, useRef, useState } from "react";
import { createRematchGameAndRedirect } from "@/app/actions/game";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { History, LoaderCircle, Redo2 } from "lucide-react";

type RematchButtonProps = {
  gameId: string;
  gameTitle: string;
  playerCount: number;
  className?: string;
  confirmButtonClassName?: string;
  iconOnly?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "xs" | "sm" | "lg";
};

function getPlayerLabel(playerCount: number) {
  return `${playerCount} player${playerCount === 1 ? "" : "s"}`;
}

export function RematchButton({
  gameId,
  gameTitle,
  playerCount,
  className,
  confirmButtonClassName,
  iconOnly = false,
  variant = "outline",
  size = "default",
}: RematchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const playerLabel = useMemo(() => getPlayerLabel(playerCount), [playerCount]);

  async function handleStartRematch() {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await createRematchGameAndRedirect(gameId);
    } catch (error) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      throw error;
    }
  }

  return (
    <>
      <Button
        aria-label={isSubmitting ? "Starting rematch..." : "Rematch"}
        className={className}
        disabled={isSubmitting}
        onClick={() => setIsOpen(true)}
        size={size}
        type="button"
        variant={variant}
      >
        {isSubmitting ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <History className="size-4" />
        )}
        {iconOnly ? null : isSubmitting ? "Starting rematch..." : "Rematch"}
      </Button>

      <Dialog onOpenChange={setIsOpen} open={isOpen}>
        <DialogContent className="rounded-[2rem] p-0 sm:max-w-md">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleStartRematch();
            }}
          >
            <div className="p-6">
              <DialogHeader className="gap-3">
                <DialogTitle className="text-2xl font-black">
                  Start rematch?
                </DialogTitle>
                <DialogDescription className="text-base">
                  Start a new{" "}
                  <span className="font-semibold text-foreground">
                    {gameTitle}
                  </span>{" "}
                  game with{" "}
                  <span className="font-semibold text-foreground">
                    {playerLabel}
                  </span>
                  ?
                </DialogDescription>
              </DialogHeader>
            </div>
            <DialogFooter className="rounded-b-[2rem]" showCloseButton>
              <Button
                className={cn("min-w-32", confirmButtonClassName)}
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Redo2 className="size-4" />
                )}
                {isSubmitting ? "Starting rematch..." : "Start rematch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
