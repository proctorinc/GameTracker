"use client";

import {
  ProfileOverviewProvider,
  useProfileOverview,
} from "./profile-overview-provider";
import type { ProfileOverviewPageData } from "./types";
import { AdminToolsCard } from "./sections/admin-tools-card";
import { ProfileDetailsCard } from "./sections/profile-details-card";
import { ProfileHeroCard } from "./sections/profile-hero-card";
import { ProfileOverviewTabs } from "./sections/profile-overview-tabs";
import { ProfileStatsTab } from "./sections/profile-stats-tab";
import { PublicProfileCard } from "./sections/public-profile-card";

function ProfileOverviewContent() {
  const { user, activeTab } = useProfileOverview();
  return (
    <div className="relative min-h-screen overflow-y-auto px-4 pb-40">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-72"
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, ${user.color} 16%, transparent) 0%, color-mix(in srgb, ${user.color} 10%, transparent) 38%, transparent 100%), radial-gradient(circle at top, color-mix(in srgb, ${user.color} 14%, transparent) 0%, transparent 68%)`,
        }}
      />
      <div className="relative mx-auto flex w-full max-w-md flex-col gap-6">
        <ProfileHeroCard />
        <ProfileOverviewTabs />
        {activeTab === "stats" ? (
          <ProfileStatsTab />
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
