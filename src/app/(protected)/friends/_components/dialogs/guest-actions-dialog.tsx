"use client";

import { Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { useFriendsPage } from "../friends-page-provider";
import { getDisplayName } from "../utils";

export function GuestActionsDialog() {
  const {
    activeRecentPlayer,
    availableFriendsForMerge,
    guestPhoneInput,
    mergeFriendUserId,
    isPending,
    setGuestPhoneInput,
    setMergeFriendUserId,
    closeRecentPlayerDialog,
    handleGuestPhoneInvite,
    handleGuestMerge,
  } = useFriendsPage();

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
          <DialogTitle>
            {activeRecentPlayer ? getDisplayName(activeRecentPlayer.user) : "Player"}
          </DialogTitle>
          <DialogDescription>
            Invite this guest by phone, or merge them into an existing friend
            if they were added twice.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="guest-phone">Phone</FieldLabel>
            <FieldContent>
              <Input
                id="guest-phone"
                type="tel"
                placeholder="+1 555 123 4567"
                autoComplete="tel"
                value={guestPhoneInput}
                onChange={(event) => setGuestPhoneInput(event.target.value)}
                disabled={isPending}
              />
            </FieldContent>
          </Field>
          <Button
            type="button"
            disabled={isPending}
            onClick={handleGuestPhoneInvite}
          >
            <Phone /> Invite by phone
          </Button>
        </FieldGroup>

        {availableFriendsForMerge.length > 0 ? (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="guest-merge-friend">
                Merge with friend
              </FieldLabel>
              <FieldContent>
                <Input
                  id="guest-merge-friend"
                  list="friend-merge-options"
                  placeholder="Friend user id"
                  value={mergeFriendUserId}
                  onChange={(event) => setMergeFriendUserId(event.target.value)}
                  disabled={isPending}
                />
                <datalist id="friend-merge-options">
                  {availableFriendsForMerge.map((friend) => (
                    <option key={friend.id} value={friend.id}>
                      {getDisplayName(friend)}
                    </option>
                  ))}
                </datalist>
              </FieldContent>
            </Field>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={handleGuestMerge}
            >
              <Users /> Merge with friend
            </Button>
          </FieldGroup>
        ) : null}

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
