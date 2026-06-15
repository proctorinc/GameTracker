"use client";

import { useMemo, useState } from "react";
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
import { LoaderCircle, Redo2 } from "lucide-react";

type RematchButtonProps = {
  gameId: string;
  gameTitle: string;
  playerCount: number;
  className?: string;
  confirmButtonClassName?: string;
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
  variant = "outline",
  size = "default",
}: RematchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const playerLabel = useMemo(() => getPlayerLabel(playerCount), [playerCount]);

  return (
    <>
      <Button
        className={className}
        onClick={() => setIsOpen(true)}
        size={size}
        type="button"
        variant={variant}
      >
        <Redo2 className="size-4" />
        Rematch
      </Button>

      <Dialog onOpenChange={setIsOpen} open={isOpen}>
        <DialogContent className="rounded-[2rem] p-0 sm:max-w-md">
          <form
            action={async () => {
              setIsSubmitting(true);
              await createRematchGameAndRedirect(gameId);
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
                Start rematch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
