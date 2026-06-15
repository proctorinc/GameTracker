import "server-only";

import { unstable_cache } from "next/cache";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import { getProfileOverviewTag, getPublicProfileTag } from "@/lib/cache-tags";
import { getUserById } from "@/lib/db/store";
import { getOwnProfileStatsPageData } from "../../[id]/page-data";
import type { ProfileOverviewPageData } from "./types";

export async function getProfileOverviewPageData(): Promise<ProfileOverviewPageData> {
  const sessionUser = await loadCurrentUser();

  return getProfileOverviewPageDataCached(sessionUser.id);
}

async function getProfileOverviewPageDataCached(
  userId: string,
): Promise<ProfileOverviewPageData> {
  return unstable_cache(
    async () => {
      const [user, publicProfile] = await Promise.all([
        getUserById(userId),
        getOwnProfileStatsPageData(userId),
      ]);

      if (!user || !publicProfile) {
        throw new Error("Authenticated user not found");
      }

      return {
        user: {
          id: user.id,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          color: user.color,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
        },
        profile: publicProfile.profile,
        defaultBestFriend: publicProfile.defaultBestFriend,
        stats: publicProfile.stats,
        comparisonOptions: publicProfile.comparisonOptions,
        comparisonSummariesByUserId: publicProfile.comparisonSummariesByUserId,
        defaultComparisonUserId: publicProfile.defaultComparisonUserId,
      };
    },
    [userId],
    {
      tags: [getProfileOverviewTag(userId), getPublicProfileTag(userId)],
    },
  )();
}
