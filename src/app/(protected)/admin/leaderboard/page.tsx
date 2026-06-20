import { AdminLeaderboardPageView } from "@/components/admin/admin-leaderboard-page";
import { getAdminLeaderboardPageData } from "./page-data";
import { requireAdminPageUser } from "../admin-guard";

export default async function AdminLeaderboardPage() {
  const adminUser = await requireAdminPageUser();
  const data = await getAdminLeaderboardPageData({
    adminUser: {
      id: adminUser.id,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      color: adminUser.color,
      playerRankLeaderboardDisabled: adminUser.playerRankLeaderboardDisabled,
    },
  });

  return <AdminLeaderboardPageView data={data} />;
}
