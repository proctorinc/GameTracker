"use client";

import { useMemo } from "react";
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
import { cn } from "@/lib/utils";

type FriendInviteShareCardProps = {
  initialInvitePath?: string | null;
  title?: string;
  description?: string;
};

type SharePanelProps = {
  initialPath?: string | null;
  qrTitle: string;
  shareButtonLabel: string;
  shareErrorMessage: string;
  qrBlurLabel?: string;
  blurQrCode?: boolean;
  sharePayload: {
    title: string;
    text: string;
  };
};

export function FriendInviteShareCard({
  initialInvitePath = null,
  title = "Invite friends",
  description = `Share your invite link to add them as a friend on ${APP_NAME}.`,
}: FriendInviteShareCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ShareQrPanel
          initialPath={initialInvitePath}
          qrTitle={`${APP_NAME} invitation QR code`}
          shareButtonLabel="Share invite"
          shareErrorMessage="Unable to share the invitation link"
          sharePayload={{
            title: `${APP_NAME} invitation`,
            text: `Add me on ${APP_NAME}.`,
          }}
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
  return (
    <ShareQrPanel
      initialPath={initialInvitePath}
      qrTitle={`${APP_NAME} invitation QR code`}
      shareButtonLabel="Share invite"
      shareErrorMessage="Unable to share the invitation link"
      sharePayload={{
        title: `${APP_NAME} invitation`,
        text: `Add me on ${APP_NAME}.`,
      }}
    />
  );
}

export function ShareQrPanel({
  initialPath = null,
  qrTitle,
  shareButtonLabel,
  shareErrorMessage,
  qrBlurLabel,
  blurQrCode,
  sharePayload,
}: SharePanelProps) {
  const { shareUrl, isLoading, handleShare } = useShareQrState({
    initialPath,
    shareErrorMessage,
    sharePayload,
  });

  return (
    <ShareQrContent
      isLoading={isLoading}
      onShare={handleShare}
      blurQrCode={blurQrCode}
      qrBlurLabel={qrBlurLabel}
      qrTitle={qrTitle}
      shareButtonLabel={shareButtonLabel}
      shareUrl={shareUrl}
    />
  );
}

function useShareQrState({
  initialPath,
  shareErrorMessage,
  sharePayload,
}: Pick<SharePanelProps, "initialPath" | "shareErrorMessage" | "sharePayload">) {
  const path = initialPath ?? null;
  const isLoading = !path;

  const shareUrl = useMemo(() => {
    if (!path || typeof window === "undefined") {
      return null;
    }

    return `${window.location.origin}${path}`;
  }, [path]);

  async function handleShare() {
    if (!shareUrl) {
      toast.error("Invitation link is still loading");
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: sharePayload.title,
          text: sharePayload.text,
          url: shareUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Invitation link copied");
        return;
      }

      toast.error("Sharing is not supported on this device");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      toast.error(shareErrorMessage);
    }
  }

  return {
    shareUrl,
    isLoading,
    handleShare,
  };
}

function ShareQrContent({
  shareUrl,
  isLoading,
  onShare,
  blurQrCode = false,
  qrBlurLabel = "QR code hidden",
  qrTitle,
  shareButtonLabel,
}: {
  shareUrl: string | null;
  isLoading: boolean;
  onShare: () => Promise<void>;
  blurQrCode?: boolean;
  qrBlurLabel?: string;
  qrTitle: string;
  shareButtonLabel: string;
}) {
  const isShareDisabled = isLoading || !shareUrl || blurQrCode;

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex justify-center">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
          <div
            className={cn(blurQrCode && "blur-md select-none")}
            data-testid={blurQrCode ? "share-qr-blurred" : "share-qr-visible"}
          >
            {shareUrl ? (
              <QRCodeSVG
                value={shareUrl}
                className="rounded-3xl"
                size={250}
                bgColor="#ffffff"
                fgColor="#111827"
                includeMargin
                title={qrTitle}
              />
            ) : (
              <div className="flex h-[184px] w-[184px] items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <QrCode className="size-8" />
              </div>
            )}
          </div>
          {blurQrCode ? (
            <div
              className="absolute inset-0 flex items-center justify-center bg-white/45 px-6 text-center text-sm font-medium text-foreground dark:bg-black/65 dark:text-white"
              data-testid="share-qr-overlay"
            >
              {qrBlurLabel}
            </div>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        disabled={isShareDisabled}
        onClick={() => {
          void onShare();
        }}
      >
        <Send /> {shareButtonLabel}
      </Button>
    </div>
  );
}
