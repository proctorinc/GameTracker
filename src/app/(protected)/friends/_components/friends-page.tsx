"use client";

import { FriendInviteSharePanel } from "@/components/profile/friend-invite-share-card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { FriendsPageData } from "@/app/actions/pages/friends";
import { FriendsPageProvider, useFriendsPage } from "./friends-page-provider";
import { GuestActionsDialog } from "./dialogs/guest-actions-dialog";
import { ActivityTabContent } from "./sections/activity-tab-content";
import { FriendsPageHeader } from "./sections/friends-page-header";
import { FriendsTabContent } from "./sections/friends-tab-content";
import { FriendsTabs } from "./sections/friends-tabs";
import { InviteNotices } from "./sections/invite-notices";
import { AddFriendCard } from "./sections/add-friend-card";

type FriendsPageProps = {
  data: FriendsPageData;
  showInviteNotice: boolean;
};

function FriendsPageContent() {
  const {
    activeTab,
    activeGuestShareInvitePath,
    activeGuestSharePlayer,
    closeGuestShareDrawer,
  } = useFriendsPage();
  const activeGuestName =
    activeGuestSharePlayer
      ? [activeGuestSharePlayer.user.firstName, activeGuestSharePlayer.user.lastName]
          .filter(Boolean)
          .join(" ") || "your guest"
      : "your guest";

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4">
        <FriendsPageHeader />
        <FriendsTabs />
        {activeTab === "activity" ? (
          <div className="flex flex-1 flex-col">
            <ActivityTabContent />
          </div>
        ) : null}
        {activeTab === "friends" ? (
          <>
            <AddFriendCard />
            <InviteNotices />
            <FriendsTabContent />
          </>
        ) : null}
      </div>

      <GuestActionsDialog />
      <Drawer
        open={Boolean(activeGuestSharePlayer)}
        onOpenChange={(open) => {
          if (!open) {
            closeGuestShareDrawer();
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Claim {activeGuestName}</DrawerTitle>
            <DrawerDescription>
              Share this one-time link so they can create or sign into an account
              and keep this guest&apos;s game history.
            </DrawerDescription>
          </DrawerHeader>
          <div className="mt-4">
            <FriendInviteSharePanel initialInvitePath={activeGuestShareInvitePath} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export function FriendsPageView({
  data,
  showInviteNotice,
}: FriendsPageProps) {
  return (
    <FriendsPageProvider
      key={`${data.user.id}:${showInviteNotice ? "notice" : "default"}`}
      data={data}
      showInviteNotice={showInviteNotice}
    >
      <FriendsPageContent />
    </FriendsPageProvider>
  );
}
