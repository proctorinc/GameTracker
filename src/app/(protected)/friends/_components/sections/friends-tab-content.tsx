"use client";

import { FriendsListCard } from "./friends-list-card";
import { InvitationsCard } from "./invitations-card";
import { RecentlyPlayedCard } from "./recently-played-card";

export function FriendsTabContent() {
  return (
    <>
      <FriendsListCard />
      <RecentlyPlayedCard />
      <InvitationsCard />
    </>
  );
}
