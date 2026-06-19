"use client";

import { Check, X } from "lucide-react";
import ProfilePicture from "@/components/profile/profile-picture";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardEmpty,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  sectionItemClassName,
  sectionItemMetaClassName,
  sectionItemTitleClassName,
} from "@/components/ui/section-styles";
import { useFriendsPage } from "../friends-page-provider";
import { getDisplayName } from "../utils";

export function InvitationsCard() {
  const {
    data,
    isPending,
    handleAcceptInvitation,
    handleDeclineInvitation,
  } = useFriendsPage();
  const { incomingInvitations } = data;

  return (
    <Card className={incomingInvitations.length > 0 ? "order-first" : undefined}>
      <CardHeader>
        <CardTitle>Invitations</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {incomingInvitations.length === 0 ? (
          <CardEmpty>No incoming invites</CardEmpty>
        ) : (
          incomingInvitations.map((invitation) => (
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
          ))
        )}
      </CardContent>
    </Card>
  );
}
