"use client";

import { RecentlyPlayedCard } from "./recently-played-card";
import { ViewFriendsCard } from "./view-friends-card";

export function FriendsTabContent() {
  return (
    <>
      <ViewFriendsCard />
      <RecentlyPlayedCard />
    </>
  );
}
