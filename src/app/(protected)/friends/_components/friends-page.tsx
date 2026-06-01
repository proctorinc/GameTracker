"use client";

import type { FriendsPageData } from "@/app/actions/pages/friends";
import { FriendsPageProvider, useFriendsPage } from "./friends-page-provider";
import { GuestActionsDialog } from "./dialogs/guest-actions-dialog";
import { RemoveFriendDialog } from "./dialogs/remove-friend-dialog";
import { FriendsPageHeader } from "./sections/friends-page-header";
import { FriendsTabContent } from "./sections/friends-tab-content";
import { FriendsTabs } from "./sections/friends-tabs";
import { InviteNotices } from "./sections/invite-notices";
import { InvitationsCard } from "./sections/invitations-card";
import { AddFriendCard } from "./sections/add-friend-card";

type FriendsPageProps = {
  data: FriendsPageData;
  showInviteNotice: boolean;
};

function FriendsPageContent() {
  const { activeTab } = useFriendsPage();

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <FriendsPageHeader />
        <FriendsTabs />
        <AddFriendCard />
        <InviteNotices />
        {activeTab === "friends" ? <FriendsTabContent /> : <InvitationsCard />}
      </div>

      <GuestActionsDialog />
      <RemoveFriendDialog />
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
