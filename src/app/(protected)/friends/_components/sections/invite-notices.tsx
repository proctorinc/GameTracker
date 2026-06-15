"use client";

import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useFriendsPage } from "../friends-page-provider";

export function InviteNotices() {
  const {
    activeTab,
    data: { incomingInvitations },
    showInviteNotice,
  } = useFriendsPage();
  const shouldShowNotice =
    activeTab === "friends" &&
    (showInviteNotice || incomingInvitations.length > 0);

  return (
    <>
      {shouldShowNotice ? (
        <Card size="sm">
          <CardContent className="flex items-center gap-2 pt-4 text-sm text-muted-foreground">
            <AlertCircle className="size-4" /> Pending invitations need your
            review.
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
