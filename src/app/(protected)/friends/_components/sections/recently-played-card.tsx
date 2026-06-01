"use client";

import { ChevronDown, UserPlus } from "lucide-react";
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
import { formatLastPlayedAt, getDisplayName } from "../utils";

export function RecentlyPlayedCard() {
  const {
    data,
    isPending,
    openRecentPlayerDialog,
    availableFriendsForMerge,
    showAllRecentlyPlayed,
    toggleShowAllRecentlyPlayed,
    visibleRecentlyPlayed,
    handleQuickInviteUser,
  } = useFriendsPage();
  const { recentlyPlayedWith } = data;
  const canMergeGuests = availableFriendsForMerge.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently Played With</CardTitle>
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
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() =>
                    entry.user.isGuest && canMergeGuests
                      ? openRecentPlayerDialog(entry)
                      : undefined
                  }
                >
                  <ProfilePicture user={entry.user} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className={sectionItemTitleClassName}>
                      {getDisplayName(entry.user)}
                    </p>
                    <p className={sectionItemMetaClassName}>
                      {formatLastPlayedAt(entry.lastPlayedAt)}
                    </p>
                  </div>
                </button>
                {entry.user.isGuest ? (
                  canMergeGuests ? (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => openRecentPlayerDialog(entry)}
                    >
                      <UserPlus />
                      <span className="sr-only">Open guest actions</span>
                    </Button>
                  ) : null
                ) : entry.pendingInvitation ? (
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
