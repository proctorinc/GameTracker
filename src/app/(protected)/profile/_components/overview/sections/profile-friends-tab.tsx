"use client";

import { AddFriendCard } from "@/app/(protected)/friends/_components/sections/add-friend-card";
import { FriendsTabContent } from "@/app/(protected)/friends/_components/sections/friends-tab-content";
import { InviteNotices } from "@/app/(protected)/friends/_components/sections/invite-notices";
import { FriendsPageProvider } from "@/app/(protected)/friends/_components/friends-page-provider";
import { AddFriendDialog } from "@/app/(protected)/friends/_components/dialogs/add-friend-dialog";
import { GuestActionsDialog } from "@/app/(protected)/friends/_components/dialogs/guest-actions-dialog";
import { RemoveFriendDialog } from "@/app/(protected)/friends/_components/dialogs/remove-friend-dialog";
import { useProfileOverview } from "../profile-overview-provider";

export function ProfileFriendsTab() {
  const { data } = useProfileOverview();

  return (
    <FriendsPageProvider
      key={`${data.socialData.user.id}:${data.showInviteNotice ? "notice" : "default"}`}
      data={data.socialData}
      showInviteNotice={data.showInviteNotice}
    >
      <div className="flex flex-col gap-4">
        <AddFriendCard />
        <InviteNotices />
        <FriendsTabContent />
      </div>
      <AddFriendDialog />
      <GuestActionsDialog />
      <RemoveFriendDialog />
    </FriendsPageProvider>
  );
}
