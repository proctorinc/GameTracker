"use client";

import { Link2, Users } from "lucide-react";
import ProfilePicture from "@/components/profile/profile-picture";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { useFriendsPage } from "../friends-page-provider";
import { getDisplayName } from "../utils";

export function GuestActionsDialog() {
  const {
    activeRecentPlayer,
    availableFriendsForMerge,
    guestActionMode,
    mergeFriendUserId,
    isPending,
    handleCreateInviteLink,
    setGuestActionMode,
    setMergeFriendUserId,
    closeRecentPlayerDialog,
    handleGuestMerge,
  } = useFriendsPage();
  const mergeOptions = availableFriendsForMerge.map((friend) => ({
    value: friend.id,
    label: getDisplayName(friend),
    keywords: [friend.firstName, friend.lastName].filter(
      (value): value is string => Boolean(value),
    ),
    friend,
  }));
  const canMerge = availableFriendsForMerge.length > 0;

  return (
    <Dialog
      open={Boolean(activeRecentPlayer)}
      onOpenChange={(open) => {
        if (!open) {
          closeRecentPlayerDialog();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            {activeRecentPlayer && (
              <ProfilePicture size="xs" user={activeRecentPlayer.user} />
            )}
            {activeRecentPlayer
              ? getDisplayName(activeRecentPlayer.user)
              : "Player"}
          </DialogTitle>
        </DialogHeader>

        {guestActionMode === "merge" ? (
          <FieldGroup>
            {canMerge ? (
              <>
                <Field>
                  <FieldLabel>Merge with friend account</FieldLabel>
                  <FieldContent>
                    <SearchableSelect
                      value={mergeFriendUserId || null}
                      onValueChange={setMergeFriendUserId}
                      options={mergeOptions}
                      placeholder="Search for a friend"
                      searchPlaceholder="Type a friend's name"
                      emptyMessage="No friends match your search."
                      disabled={isPending}
                      includeValueInSearch={false}
                      renderOption={(option) => (
                        <span className="flex min-w-0 items-center gap-2">
                          <ProfilePicture user={option.friend} size="xs" />
                          <span className="truncate">{option.label}</span>
                        </span>
                      )}
                      renderSelectedValue={(option) => (
                        <span className="flex min-w-0 items-center gap-2">
                          <ProfilePicture user={option.friend} size="xs" />
                          <span className="truncate">{option.label}</span>
                        </span>
                      )}
                    />
                  </FieldContent>
                </Field>
              </>
            ) : null}
          </FieldGroup>
        ) : (
          <FieldGroup>
            {activeRecentPlayer ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleCreateInviteLink(activeRecentPlayer.user.id)}
              >
                <Link2 /> Share invitation link
              </Button>
            ) : null}
            {canMerge ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setGuestActionMode("merge")}
              >
                <Users /> Merge with friend account
              </Button>
            ) : null}
          </FieldGroup>
        )}

        <DialogFooter showCloseButton>
          {guestActionMode === "merge" && canMerge ? (
            <Button
              type="button"
              disabled={isPending}
              onClick={handleGuestMerge}
            >
              <Users /> Merge with friend
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
