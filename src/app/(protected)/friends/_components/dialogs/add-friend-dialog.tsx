"use client";

import { Link2, Phone } from "lucide-react";
import { toast } from "sonner";
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
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFriendsPage } from "../friends-page-provider";

export function AddFriendDialog() {
  const {
    invitePhone,
    isInviteDialogOpen,
    isPending,
    publicProfileUrl,
    setInvitePhone,
    setIsInviteDialogOpen,
    copyLink,
    handleInviteByPhone,
  } = useFriendsPage();

  return (
    <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
          <DialogDescription>
            Share your public profile so someone can add you, or invite them by
            phone if you know their number.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Button
            type="button"
            variant="outline"
            disabled={isPending || !publicProfileUrl}
            onClick={() => {
              copyLink(publicProfileUrl).then(() => {
                toast.success("Public profile link copied");
              });
            }}
          >
            <Link2 /> Copy public profile link
          </Button>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="invite-phone">Phone</FieldLabel>
            <FieldContent>
              <Input
                id="invite-phone"
                type="tel"
                placeholder="+1 555 123 4567"
                autoComplete="tel"
                value={invitePhone}
                onChange={(event) => setInvitePhone(event.target.value)}
                disabled={isPending}
              />
              <FieldDescription>
                If they already have an account, we will match it after they
                verify that number.
              </FieldDescription>
            </FieldContent>
          </Field>
          <Button type="button" disabled={isPending} onClick={handleInviteByPhone}>
            <Phone /> Invite by phone
          </Button>
        </FieldGroup>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
