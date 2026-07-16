"use client";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { resetAnnouncementAcknowledgmentAction } from "@/app/actions/announcements";
import { Button } from "@/components/ui/button";

export function AdminAnnouncementResetButton({
  announcementId,
  disabled,
}: {
  announcementId: string;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function resetForCurrentAdmin() {
    startTransition(async () => {
      try {
        await resetAnnouncementAcknowledgmentAction({ announcementId });
        toast.success("Announcement marked unseen for you");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not mark announcement unseen",
        );
      }
    });
  }

  return (
    <Button
      disabled={disabled || isPending}
      onClick={resetForCurrentAdmin}
      size="sm"
      title={
        disabled
          ? "Only active published announcements can be marked unseen"
          : "Show this announcement to your account again"
      }
      type="button"
      variant="outline"
    >
      {isPending ? <LoaderCircle className="animate-spin" /> : <RotateCcw />}
      Mark unseen for me
    </Button>
  );
}
