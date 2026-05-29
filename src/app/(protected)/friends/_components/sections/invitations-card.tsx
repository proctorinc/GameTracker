"use client";

import { Check, X } from "lucide-react";
import ProfilePicture from "@/components/profile/profile-picture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardEmpty, CardHeader, CardTitle } from "@/components/ui/card";
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
    handleRevokeInvitation,
  } = useFriendsPage();
  const { incomingInvitations, outgoingInvitations } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitations</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
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
        </div>

        {outgoingInvitations.length > 0 ? (
          <div className="flex flex-col gap-2">
            {outgoingInvitations.map((invitation) => {
              const invitationTarget = invitation.invitee
                ? getDisplayName(invitation.invitee)
                : invitation.inviteePhoneNumber
                  ? invitation.inviteePhoneNumber
                  : "Shared invite";
              const invitationLabel =
                invitation.targetType === "phone"
                  ? "Phone invite"
                  : invitation.targetType === "link"
                    ? "Legacy share link"
                    : invitation.kind === "claim_guest"
                      ? "Guest claim invite"
                      : "Friend invitation";

              return (
                <div
                  key={invitation.id}
                  className={`flex items-center gap-3 ${sectionItemClassName}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={sectionItemTitleClassName}>{invitationTarget}</p>
                    <p className={`truncate ${sectionItemMetaClassName}`}>
                      {invitationLabel}
                    </p>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleRevokeInvitation(invitation.id)}
                  >
                    <X />
                    <span className="sr-only">Cancel invitation</span>
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
