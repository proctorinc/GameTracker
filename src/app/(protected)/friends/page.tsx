import { FriendsPageView } from "./_components/friends-page";
import { getFriendsOverviewPageData } from "./_components/page-data";

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ invites?: string }>;
}) {
  const [data, params] = await Promise.all([
    getFriendsOverviewPageData(),
    searchParams,
  ]);

  return (
    <FriendsPageView
      data={data}
      showInviteNotice={params.invites === "1"}
    />
  );
}
