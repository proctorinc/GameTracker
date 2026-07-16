import "server-only";

import { unstable_cache } from "next/cache";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import { getFriendsTag, getProfileIdentityTag } from "@/lib/cache-tags";
import { getFriendsPageCollections } from "@/app/actions/pages/friends";
import { isNextRedirectError } from "@/lib/next-navigation-errors";
import { logError, logInfo } from "@/lib/server-log";
import { getServerRequestContext } from "@/lib/server-request-context";

const FRIENDS_PAGE_REVALIDATE_SECONDS = 15;

export async function getFriendConnectionsPageData() {
  const requestContext = await getServerRequestContext();

  try {
    const user = await loadCurrentUser({
      onMissingAuth: "redirect",
      returnPath: "/friends",
    });
    const data = await getFriendConnectionsPageDataCached(user.id);

    logInfo("friend_connections.page_data.read.succeeded", {
      ...requestContext,
      userId: user.id,
      friendCount: data.friends.length,
      incomingInvitationCount: data.incomingInvitations.length,
      outgoingInvitationCount: data.outgoingInvitations.length,
      recentEntryCount: data.recentlyPlayedWith.length,
      activityCount: data.friendActivity.length,
    });

    return {
      user,
      ...data,
    };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    logError("friend_connections.page_data.read.failed", error, requestContext);
    throw error;
  }
}

export const getFriendsOverviewPageData = getFriendConnectionsPageData;

async function getFriendConnectionsPageDataCached(
  userId: string,
) {
  return unstable_cache(
    async () =>
      getFriendsPageCollections({
        userId,
      }),
    [userId],
    {
      tags: [getFriendsTag(userId), getProfileIdentityTag()],
      revalidate: FRIENDS_PAGE_REVALIDATE_SECONDS,
    },
  )();
}
