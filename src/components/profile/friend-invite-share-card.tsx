"use client";

import { useEffect, useMemo, useState } from "react";
import { QrCode, Send } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
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
  description = `Share your invite link to add them as a friend on ${APP_NAME}.`,
}: FriendInviteShareCardProps) {
  const { inviteUrl, isLoading, handleShare } = useFriendInviteShareState({
    initialInvitePath,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <FriendInviteShareContent
          inviteUrl={inviteUrl}
          isLoading={isLoading}
          onShare={handleShare}
        />
      </CardContent>
    </Card>
  );
}

export function FriendInviteSharePanel({
  initialInvitePath = null,
}: {
  initialInvitePath?: string | null;
}) {
  const { inviteUrl, isLoading, handleShare } = useFriendInviteShareState({
    initialInvitePath,
  });

  return (
    <FriendInviteShareContent
      inviteUrl={inviteUrl}
      isLoading={isLoading}
      onShare={handleShare}
    />
  );
}

function useFriendInviteShareState({
  initialInvitePath,
}: {
  initialInvitePath: string | null;
}) {
  const [invitePath, setInvitePath] = useState<string | null>(
    initialInvitePath,
  );
  const [isLoading, setIsLoading] = useState(!initialInvitePath);

  useEffect(() => {
    setInvitePath(initialInvitePath);
    setIsLoading(!initialInvitePath);
  }, [initialInvitePath]);

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

  return {
    inviteUrl,
    isLoading,
    handleShare,
  };
}

function FriendInviteShareContent({
  inviteUrl,
  isLoading,
  onShare,
}: {
  inviteUrl: string | null;
  isLoading: boolean;
  onShare: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex justify-center">
        <div className="rounded-3xl border border-border bg-white shadow-sm">
          {inviteUrl ? (
            <QRCodeSVG
              value={inviteUrl}
              className="rounded-3xl"
              size={250}
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
      <Button
        type="button"
        disabled={isLoading || !inviteUrl}
        onClick={() => {
          void onShare();
        }}
      >
        <Send /> Share invite
      </Button>
    </div>
  );
}
