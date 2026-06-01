import "server-only";

import { unstable_cache } from "next/cache";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import { getFriendsTag } from "@/lib/cache-tags";
import { getFriendsPageCollections } from "@/app/actions/pages/friends";
import { logError, logInfo } from "@/lib/server-log";
import { getServerRequestContext } from "@/lib/server-request-context";

export async function getFriendsOverviewPageData() {
  const requestContext = await getServerRequestContext();

  try {
    const user = await loadCurrentUser();
    const data = await getFriendsOverviewPageDataCached(
      user.id,
      user.phoneNumber ?? null,
    );

    logInfo("friends.page_data.read.succeeded", {
      ...requestContext,
      userId: user.id,
      friendCount: data.friends.length,
      incomingInvitationCount: data.incomingInvitations.length,
      outgoingInvitationCount: data.outgoingInvitations.length,
      recentEntryCount: data.recentlyPlayedWith.length,
    });

    return {
      user,
      ...data,
    };
  } catch (error) {
    logError("friends.page_data.read.failed", error, requestContext);
    throw error;
  }
}

async function getFriendsOverviewPageDataCached(
  userId: string,
  phoneNumber: string | null,
) {
  return unstable_cache(
    async () =>
      getFriendsPageCollections({
        userId,
        phoneNumber,
      }),
    [userId, phoneNumber ?? ""],
    {
      tags: [getFriendsTag(userId)],
    },
  )();
}
