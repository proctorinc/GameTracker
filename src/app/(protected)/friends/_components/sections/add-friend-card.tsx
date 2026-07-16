"use client";

import Link from "next/link";
import { ArrowUpRight, Link2, QrCode, Trophy, Users } from "lucide-react";
import { FriendInviteSharePanel } from "@/components/profile/friend-invite-share-card";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="grid grid-cols-2 gap-4">
        <DrawerTrigger
          render={
            <button
              type="button"
              className="group flex aspect-square w-full flex-col rounded-xl border border-border bg-muted/60 p-4 text-left transition-colors hover:bg-muted"
            />
          }
        >
          <div className="flex flex-1 items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
              <QrCode className="size-7" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Add friends</p>
              <p className="text-xs text-muted-foreground">Share to add</p>
            </div>
            <Link2 className="size-5 text-muted-foreground transition-transform group-hover:scale-105" />
          </div>
        </DrawerTrigger>

        <Link
          href="/activity?tab=leaderboard"
          className="group flex aspect-square flex-col rounded-xl border border-border bg-muted/60 p-4 text-left transition-colors hover:bg-muted"
        >
          <div className="flex flex-1 items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
              <Users className="size-7" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">View friends</p>
              <p className="text-xs text-muted-foreground">Leaderboard</p>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Trophy className="size-5" />
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          </div>
        </Link>
      </div>
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
