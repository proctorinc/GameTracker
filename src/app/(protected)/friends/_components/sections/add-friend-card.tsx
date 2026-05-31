"use client";

import { Link2, MessageSquareMore, Phone, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFriendsPage } from "../friends-page-provider";

export function AddFriendCard() {
  const { copyLink, isPending, publicProfileUrl, setIsInviteDialogOpen } =
    useFriendsPage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Add a friend
          <div className="flex gap-2">
            <Button
              size="icon"
              type="button"
              variant="outline"
              disabled={isPending || !publicProfileUrl}
              onClick={() => {
                copyLink(publicProfileUrl).then(() => {
                  toast.success("Public profile link copied");
                });
              }}
            >
              <Link2 />
            </Button>
            <Button
              size="icon"
              type="button"
              disabled={isPending}
              onClick={() => setIsInviteDialogOpen(true)}
            >
              <MessageSquareMore />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
