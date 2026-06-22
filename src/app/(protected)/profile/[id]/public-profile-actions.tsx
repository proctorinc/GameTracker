"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createFriendInvitationByUserId,
  removeFriend,
} from "@/app/actions/friends";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PublicProfileViewerState } from "./page-data";

type PublicProfileActionsProps = {
  profileId: string;
  profileName: string;
  viewerState: PublicProfileViewerState;
};

export function PublicProfileActions({
  profileId,
  profileName,
  viewerState,
}: PublicProfileActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  if (!viewerState) {
    return null;
  }

  if (viewerState.kind === "self") {
    return null;
  }

  if (viewerState.kind === "signed_out") {
    return (
      <Link
        href={`/login?from=${encodeURIComponent(`/profile/${profileId}`)}`}
        className={buttonVariants({ size: "sm", className: "rounded-full" })}
      >
        Log in to add friend
      </Link>
    );
  }

  if (viewerState.kind === "friends") {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button disabled size="sm" variant="secondary">
            You&apos;re friends
          </Button>
          <Button
            variant="outline"
            disabled={isPending}
            size="sm"
            onClick={() => setShowRemoveDialog(true)}
          >
            <Trash2 />
            Unfriend
          </Button>
        </div>
        <Dialog
          open={showRemoveDialog}
          onOpenChange={(open) => {
            if (!isPending) {
              setShowRemoveDialog(open);
            }
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Unfriend {profileName}?</DialogTitle>
              <DialogDescription>
                This will remove them from your friends list.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              You can always send another friend invite later.
            </p>
            <DialogFooter showCloseButton>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const loadingId = toast.loading("Removing friend...");

                    try {
                      await removeFriend({ friendUserId: profileId });
                      toast.dismiss(loadingId);
                      toast.success("Friend removed");
                      setShowRemoveDialog(false);
                      router.refresh();
                    } catch (error) {
                      toast.dismiss(loadingId);
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Unable to remove friend",
                      );
                    }
                  });
                }}
              >
                <Trash2 /> Unfriend
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (viewerState.kind === "incoming_invitation") {
    return (
      <Link
        href="/profile?tab=friends&invites=1"
        className={buttonVariants({ size: "sm", className: "rounded-full" })}
      >
        View invitation
      </Link>
    );
  }

  if (viewerState.kind === "outgoing_invitation") {
    return (
      <Link
        href="/profile?tab=friends"
        className={buttonVariants({
          size: "sm",
          variant: "secondary",
          className: "rounded-full",
        })}
      >
        Invitation sent
      </Link>
    );
  }

  return (
    <Button
      size="sm"
      className="rounded-full"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const loadingId = toast.loading(
            `Sending invite to ${profileName}...`,
          );

          try {
            await createFriendInvitationByUserId({ inviteeUserId: profileId });
            toast.dismiss(loadingId);
            toast.success("Friend invitation sent");
            router.refresh();
          } catch (error) {
            toast.dismiss(loadingId);
            toast.error(
              error instanceof Error
                ? error.message
                : "Unable to send invitation",
            );
          }
        });
      }}
    >
      Add friend
    </Button>
  );
}
