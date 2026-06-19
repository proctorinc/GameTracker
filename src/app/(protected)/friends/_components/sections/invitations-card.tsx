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
import { cn } from "@/lib/utils";

export function InvitationsCard() {
  const {
    data,
    isPending,
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleRevokeInvitation,
    handleReshareInvitation,
  } = useFriendsPage();
  const { incomingInvitations, outgoingInvitations } = data;
  const outgoingGuestInvitations = outgoingInvitations.filter(
    (invitation) =>
      invitation.kind === "claim_guest" &&
      invitation.targetType === "link" &&
      Boolean(invitation.inviteToken) &&
      Boolean(invitation.guestUser),
  );

  return (
    <Card className={cn(incomingInvitations.length > 0 && "order-first")}>
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

        {outgoingGuestInvitations.length > 0 ? (
          <div className="flex flex-col gap-2">
            {outgoingGuestInvitations.map((invitation) => {
              const invitationTarget = invitation.guestUser
                ? getDisplayName(invitation.guestUser)
                : "Guest player";

              return (
                <div
                  key={invitation.id}
                  className={`flex items-center gap-3 ${sectionItemClassName}`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    disabled={isPending}
                    onClick={() => {
                      if (!invitation.inviteToken) {
                        return;
                      }

                      void handleReshareInvitation({
                        invitePath: `/invite/${invitation.inviteToken}`,
                        guestName: invitation.guestUser
                          ? getDisplayName(invitation.guestUser)
                          : null,
                      });
                    }}
                  >
                    <p className={sectionItemTitleClassName}>
                      {invitationTarget}
                    </p>
                    <p className={`truncate ${sectionItemMetaClassName}`}>
                      Guest invitation link
                    </p>
                  </button>
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
