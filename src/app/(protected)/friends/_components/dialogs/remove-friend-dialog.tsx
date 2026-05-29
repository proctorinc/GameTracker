"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFriendsPage } from "../friends-page-provider";
import { getDisplayName } from "../utils";

export function RemoveFriendDialog() {
  const {
    friendToRemove,
    isPending,
    setFriendToRemove,
    handleRemoveFriendConfirm,
  } = useFriendsPage();

  return (
    <Dialog
      open={Boolean(friendToRemove)}
      onOpenChange={(open) => {
        if (!open) {
          setFriendToRemove(null);
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove Friend</DialogTitle>
          <DialogDescription>
            This will remove{" "}
            {friendToRemove ? getDisplayName(friendToRemove) : "this friend"} from
            your friends list.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Please confirm again to continue.
        </p>
        <DialogFooter showCloseButton>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={handleRemoveFriendConfirm}
          >
            <Trash2 /> Remove friend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
