"use client";

import { Link2, QrCode, UserPlus } from "lucide-react";
import { FriendInviteSharePanel } from "@/components/profile/friend-invite-share-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useFriendsPage } from "../friends-page-provider";

export function AddFriendCard() {
  const { data } = useFriendsPage();

  return (
    <Drawer>
      <DrawerTrigger
        render={<button type="button" className="w-full text-left" />}
      >
        <Card>
          <CardHeader className="gap-3">
            <CardTitle>Share</CardTitle>
            <div className="group rounded-2xl border border-border bg-muted/60 transition-colors hover:bg-muted">
              <span className="flex w-full items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
                    <Link2 className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Share to add a friend</p>
                    <p className="text-xs text-muted-foreground">
                      Open a QR code and shareable invite link
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <QrCode className="size-4" />
                  <UserPlus className="size-4" />
                </div>
              </span>
            </div>
          </CardHeader>
        </Card>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add a friend</DrawerTitle>
          <DrawerDescription>
            Scan the QR code or share the link to instantly add a friend.
          </DrawerDescription>
        </DrawerHeader>
        <div className="mt-4">
          <FriendInviteSharePanel initialInvitePath={data.friendInvitePath} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
