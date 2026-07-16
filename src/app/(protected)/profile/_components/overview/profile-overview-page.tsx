"use client";

import {
  ProfileOverviewProvider,
  useProfileOverview,
} from "./profile-overview-provider";
import type { ProfileOverviewPageData } from "./types";
import { AdminToolsCard } from "./sections/admin-tools-card";
import { ProfileDetailsCard } from "./sections/profile-details-card";
import { ProfileHeroCard } from "./sections/profile-hero-card";
import { ProfileFriendsTab } from "./sections/profile-friends-tab";
import { ProfileOverviewTabs } from "./sections/profile-overview-tabs";
import { ProfileStatsTab } from "./sections/profile-stats-tab";
import { PublicProfileCard } from "./sections/public-profile-card";
import { ProfileCollectionTab } from "./sections/profile-collection-tab";

function ProfileOverviewContent() {
  const { user, activeTab, data } = useProfileOverview();
  const visibleTab =
    activeTab === "collection" && data.cardsEnabled === false
      ? "stats"
      : activeTab;
  return (
    <div className="relative min-h-screen overflow-y-auto px-4 pb-40">
      <div className="relative mx-auto flex w-full max-w-md flex-col gap-6">
        <ProfileHeroCard />
        <ProfileOverviewTabs />
        {visibleTab === "stats" ? (
          <ProfileStatsTab />
        ) : visibleTab === "friends" ? (
          <ProfileFriendsTab />
        ) : visibleTab === "collection" ? (
          <ProfileCollectionTab />
        ) : (
          <>
            <PublicProfileCard />
            <ProfileDetailsCard />
            {user.role === "admin" ? <AdminToolsCard /> : null}
          </>
        )}
      </div>
    </div>
  );
}

export function ProfileOverviewPage({
  initialData,
}: {
  initialData: ProfileOverviewPageData;
}) {
  return (
    <ProfileOverviewProvider initialData={initialData}>
      <ProfileOverviewContent />
    </ProfileOverviewProvider>
  );
}
