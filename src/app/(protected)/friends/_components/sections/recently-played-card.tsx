"use client";

import { ChevronDown, Share2, UserPlus } from "lucide-react";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardEmpty,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  sectionActionToneClassName,
  sectionItemClassName,
  sectionItemMetaClassName,
  sectionItemTitleClassName,
} from "@/components/ui/section-styles";
import { useFriendsPage } from "../friends-page-provider";
import {
  formatLastPlayedAt,
  getDisplayName,
  useClientDateFormatting,
} from "../utils";

export function RecentlyPlayedCard() {
  const dateFormatting = useClientDateFormatting();
  const {
    data,
    isPending,
    openGuestShareDrawer,
    showAllRecentlyPlayed,
    toggleShowAllRecentlyPlayed,
    visibleRecentlyPlayed,
    handleQuickInviteUser,
    handleReshareInvitation,
  } = useFriendsPage();
  const { recentlyPlayedWith } = data;

  function isReshareableGuestInvitation(
    pendingInvitation: (typeof visibleRecentlyPlayed)[number]["pendingInvitation"],
  ) {
    return Boolean(
      pendingInvitation &&
      pendingInvitation.kind === "claim_guest" &&
      pendingInvitation.targetType === "link" &&
      pendingInvitation.inviteToken,
    );
  }

  function isOwnedGuest(entry: (typeof visibleRecentlyPlayed)[number]) {
    return entry.user.isGuest && entry.user.created_by_user_id === data.user.id;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage my guests</CardTitle>
        {recentlyPlayedWith.length > 3 ? (
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              className={sectionActionToneClassName}
              onClick={toggleShowAllRecentlyPlayed}
            >
              Show all
              <ChevronDown
                className={`transition-transform ${showAllRecentlyPlayed ? "rotate-180" : ""}`}
              />
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {recentlyPlayedWith.length === 0 ? (
          <CardEmpty>No recent players yet</CardEmpty>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleRecentlyPlayed.map((entry) => (
              <div
                key={entry.user.id}
                className={`flex items-center gap-3 ${sectionItemClassName}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {isOwnedGuest(entry) ? (
                    <button
                      type="button"
                      className="rounded-full"
                      disabled={isPending}
                      aria-label={`Share claim link for ${getDisplayName(entry.user)}`}
                      onClick={() => openGuestShareDrawer(entry)}
                    >
                      <ProfilePicture user={entry.user} size="sm" />
                    </button>
                  ) : (
                    <ProfilePicture user={entry.user} size="sm" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={sectionItemTitleClassName}>
                      {getDisplayName(entry.user)}
                    </p>
                    <p className={sectionItemMetaClassName}>
                      {isReshareableGuestInvitation(entry.pendingInvitation)
                        ? "Invitation link shared"
                        : formatLastPlayedAt(
                            entry.lastPlayedAt,
                            dateFormatting,
                          )}
                    </p>
                  </div>
                </div>
                {isOwnedGuest(entry) &&
                isReshareableGuestInvitation(entry.pendingInvitation) ? (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => {
                      if (!entry.pendingInvitation?.inviteToken) {
                        return;
                      }

                      void handleReshareInvitation({
                        invitePath: `/invite/${entry.pendingInvitation.inviteToken}`,
                        guestName: getDisplayName(entry.user),
                      });
                    }}
                  >
                    <Share2 />
                    <span className="sr-only">Reshare invitation link</span>
                  </Button>
                ) : isOwnedGuest(entry) ? (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => openGuestShareDrawer(entry)}
                  >
                    <Share2 />
                    <span className="sr-only">Open guest claim share</span>
                  </Button>
                ) : entry.user.isGuest ? null : entry.pendingInvitation ? (
                  <Badge variant="outline">Pending</Badge>
                ) : (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleQuickInviteUser(entry.user.id)}
                  >
                    <UserPlus />
                    <span className="sr-only">Invite to be friends</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
