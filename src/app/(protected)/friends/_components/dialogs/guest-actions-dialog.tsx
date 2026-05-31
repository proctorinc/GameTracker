"use client";

import { Phone, Users } from "lucide-react";
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
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { useFriendsPage } from "../friends-page-provider";
import { getDisplayName } from "../utils";

export function GuestActionsDialog() {
  const {
    activeRecentPlayer,
    availableFriendsForMerge,
    guestActionMode,
    guestPhoneInput,
    mergeFriendUserId,
    isPending,
    setGuestActionMode,
    setGuestPhoneInput,
    setMergeFriendUserId,
    closeRecentPlayerDialog,
    handleGuestPhoneInvite,
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

        {guestActionMode ? (
          <FieldGroup>
            {guestActionMode === "phone" ? (
              <>
                <Field>
                  <FieldLabel htmlFor="guest-phone">Phone</FieldLabel>
                  <FieldContent>
                    <PhoneNumberInput
                      id="guest-phone"
                      value={guestPhoneInput}
                      onChange={setGuestPhoneInput}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
              </>
            ) : canMerge ? (
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
            <Button
              type="button"
              disabled={isPending}
              onClick={() => setGuestActionMode("phone")}
            >
              <Phone /> Invite by phone number
            </Button>
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
          {guestActionMode ? (
            <>
              {guestActionMode === "phone" ? (
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={handleGuestPhoneInvite}
                >
                  <Phone /> Invite by phone
                </Button>
              ) : canMerge ? (
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={handleGuestMerge}
                >
                  <Users /> Merge with friend
                </Button>
              ) : null}
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
