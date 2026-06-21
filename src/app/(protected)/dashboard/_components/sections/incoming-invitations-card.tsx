"use client";

import { Check, X } from "lucide-react";
import { getDisplayName } from "@/app/(protected)/friends/_components/utils";
import ProfilePicture from "@/components/profile/profile-picture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  sectionItemClassName,
  sectionItemMetaClassName,
  sectionItemTitleClassName,
} from "@/components/ui/section-styles";
import { useDashboardPage } from "../dashboard-page-provider";

export function IncomingInvitationsCard() {
  const {
    incomingInvitations,
    isPending,
    handleAcceptInvitation,
    handleDeclineInvitation,
  } = useDashboardPage();

  if (incomingInvitations.length === 0) {
    return null;
  }

  return (
    <Card className="mx-4">
      <CardHeader>
        <CardTitle>Invitations</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {incomingInvitations.map((invitation) => (
          <div
            key={invitation.id}
            className={`flex items-center gap-3 ${sectionItemClassName}`}
          >
            <ProfilePicture user={invitation.inviter} size="sm" />
            <div className="min-w-0 flex-1">
              <p className={sectionItemTitleClassName}>
                {getDisplayName(invitation.inviter)}
              </p>
              <p className={sectionItemMetaClassName}>
                {invitation.kind === "claim_guest"
                  ? "Claim guest history"
                  : "Friend invitation"}
              </p>
            </div>
            <Button
              size="icon-sm"
              disabled={isPending}
              onClick={() => handleAcceptInvitation(invitation.id)}
            >
              <Check />
              <span className="sr-only">Accept invitation</span>
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => handleDeclineInvitation(invitation.id)}
            >
              <X />
              <span className="sr-only">Decline invitation</span>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
