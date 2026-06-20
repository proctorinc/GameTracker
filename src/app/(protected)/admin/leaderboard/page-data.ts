import "server-only";

import {
  buildActivityLeaderboard,
  type ActivityLeaderboardFriend,
} from "@/app/(protected)/activity/_components/leaderboard-utils";
import type { ActivityPageData } from "@/app/(protected)/activity/_components/page-data";
import {
  listAdminVisibleLeaderboardUsers,
  listGlobalActivityGames,
  listPlayerRankStandings,
} from "@/lib/db/store";

export type AdminLeaderboardPageData = ActivityPageData;

export async function getAdminLeaderboardPageData(input: {
  adminUser: ActivityPageData["user"];
}): Promise<AdminLeaderboardPageData> {
  const visibleUsers = await listAdminVisibleLeaderboardUsers();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const userIds = visibleUsers.map((user) => user.id);
  const [friendActivity, standings] = await Promise.all([
    listGlobalActivityGames({
      userIds,
      since,
    }),
    listPlayerRankStandings(),
  ]);

  return {
    user: input.adminUser,
    friends: [],
    friendActivity: [],
    leaderboardFriends: buildActivityLeaderboard({
      currentUser: null,
      friends: visibleUsers,
      friendActivity,
      standings,
    }) as ActivityLeaderboardFriend[],
    playerRankTrend: null,
  };
}
