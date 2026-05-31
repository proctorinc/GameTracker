"use client";

import {
  ProfileOverviewProvider,
  useProfileOverview,
} from "./profile-overview-provider";
import type { ProfileOverviewPageData } from "./types";
import { AdminToolsCard } from "./sections/admin-tools-card";
import { ProfileDetailsCard } from "./sections/profile-details-card";
import { ProfileHeroCard } from "./sections/profile-hero-card";
import { PublicProfileCard } from "./sections/public-profile-card";

function ProfileOverviewContent() {
  const { user } = useProfileOverview();
  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <ProfileHeroCard />
        <PublicProfileCard />
        <ProfileDetailsCard />
        {user.role === "admin" ? <AdminToolsCard /> : null}
      </div>
    </div>
  );
}

export function ProfileOverviewPage({
  initialData,
  publicProfileUrl,
}: {
  initialData: ProfileOverviewPageData;
  publicProfileUrl: string;
}) {
  return (
    <ProfileOverviewProvider
      key={`${initialData.user.id}:${initialData.user.firstName ?? ""}:${initialData.user.lastName ?? ""}:${initialData.user.color}:${publicProfileUrl}`}
      initialData={{
        ...initialData,
        user: {
          ...initialData.user,
          publicProfileUrl,
        },
      }}
    >
      <ProfileOverviewContent />
    </ProfileOverviewProvider>
  );
}
