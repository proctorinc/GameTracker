"use client";

import { useEffect, useMemo, useState } from "react";
import { QrCode, Send } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { getOrCreateFriendInviteLink } from "@/app/actions/user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/app-config";

type FriendInviteShareCardProps = {
  initialInvitePath?: string | null;
  title?: string;
  description?: string;
};

export function FriendInviteShareCard({
  initialInvitePath = null,
  title = "Invite friends",
  description = `Share your invite link so people can connect with you on ${APP_NAME}.`,
}: FriendInviteShareCardProps) {
  const [invitePath, setInvitePath] = useState<string | null>(initialInvitePath);
  const [isLoading, setIsLoading] = useState(!initialInvitePath);

  useEffect(() => {
    if (invitePath) {
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    void getOrCreateFriendInviteLink()
      .then((result) => {
        if (!isCancelled) {
          setInvitePath(result.invitePath);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load invitation link",
          );
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [invitePath]);

  const inviteUrl = useMemo(() => {
    if (!invitePath || typeof window === "undefined") {
      return null;
    }

    return `${window.location.origin}${invitePath}`;
  }, [invitePath]);

  async function handleShare() {
    if (!inviteUrl) {
      toast.error("Invitation link is still loading");
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${APP_NAME} invitation`,
          text: `Add me on ${APP_NAME}.`,
          url: inviteUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success("Invitation link copied");
        return;
      }

      toast.error("Sharing is not supported on this device");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      toast.error("Unable to share the invitation link");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex justify-center">
          <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
            {inviteUrl ? (
              <QRCodeSVG
                value={inviteUrl}
                size={184}
                bgColor="#ffffff"
                fgColor="#111827"
                includeMargin
                title={`${APP_NAME} invitation QR code`}
              />
            ) : (
              <div className="flex h-[184px] w-[184px] items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <QrCode className="size-8" />
              </div>
            )}
          </div>
        </div>
        <p className="break-all rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-3 text-center text-xs text-muted-foreground">
          {inviteUrl ?? "Loading invitation link..."}
        </p>
        <Button
          type="button"
          disabled={isLoading || !inviteUrl}
          onClick={() => {
            void handleShare();
          }}
        >
          <Send /> Share invite
        </Button>
      </CardContent>
    </Card>
  );
}
