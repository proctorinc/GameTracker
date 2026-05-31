"use client";

import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldGroup } from "@/components/ui/field";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { useFriendsPage } from "../friends-page-provider";

export function AddFriendDialog() {
  const {
    invitePhone,
    isInviteDialogOpen,
    isPending,
    setInvitePhone,
    setIsInviteDialogOpen,
    handleInviteByPhone,
  } = useFriendsPage();

  return (
    <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite by phone number</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldContent>
              <PhoneNumberInput
                id="invite-phone"
                value={invitePhone}
                onChange={setInvitePhone}
                disabled={isPending}
              />
            </FieldContent>
          </Field>
        </FieldGroup>

        <DialogFooter showCloseButton>
          <Button
            type="button"
            disabled={isPending}
            onClick={handleInviteByPhone}
          >
            <Phone /> Invite by phone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
