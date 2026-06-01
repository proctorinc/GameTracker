"use client";

import Link from "next/link";
import { Send, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { createFriendInvitationByUserId } from "@/app/actions/friends";
import { Button, buttonVariants } from "@/components/ui/button";
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

  async function handleShare() {
    const profileUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profileName} on Skyjo`,
          text: `Check out ${profileName}'s public profile on Skyjo.`,
          url: profileUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(profileUrl);
        toast.success("Public profile link copied");
        return;
      }

      toast.error("Sharing is not supported on this device");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      toast.error("Unable to share your public profile");
    }
  }

  if (!viewerState) {
    return null;
  }

  if (viewerState.kind === "self") {
    return (
      <button
        type="button"
        className="group rounded-2xl border border-border bg-muted/60 text-left transition-colors hover:bg-muted"
        onClick={() => {
          void handleShare();
        }}
      >
        <span className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
              <Share2 className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Share profile</p>
              <p className="text-xs text-muted-foreground">
                Send your public profile link to someone
              </p>
            </div>
          </div>
          <Send className="size-4 text-muted-foreground" />
        </span>
      </button>
    );
  }

  if (viewerState.kind === "signed_out") {
    return (
      <Link
        href={`/login?from=${encodeURIComponent(`/profile/${profileId}`)}`}
        className={buttonVariants({ size: "lg", className: "rounded-full" })}
      >
        Log in to add friend
      </Link>
    );
  }

  if (viewerState.kind === "friends") {
    return (
      <Link
        href="/friends"
        className={buttonVariants({
          size: "lg",
          variant: "secondary",
          className: "rounded-full",
        })}
      >
        You&apos;re friends
      </Link>
    );
  }

  if (viewerState.kind === "incoming_invitation") {
    return (
      <Link
        href="/friends"
        className={buttonVariants({ size: "lg", className: "rounded-full" })}
      >
        View invitation
      </Link>
    );
  }

  if (viewerState.kind === "outgoing_invitation") {
    return (
      <Link
        href="/friends"
        className={buttonVariants({
          size: "lg",
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
      size="lg"
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
