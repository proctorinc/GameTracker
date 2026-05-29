import { headers } from "next/headers";
import { FriendsPageView } from "./_components/friends-page";
import { getFriendsOverviewPageData } from "./_components/page-data";
import { getBaseUrl } from "./_components/utils";

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ invites?: string }>;
}) {
  const [data, headerStore, params] = await Promise.all([
    getFriendsOverviewPageData(),
    headers(),
    searchParams,
  ]);

  const host = headerStore.get("host");

  return (
    <FriendsPageView
      data={data}
      baseUrl={getBaseUrl(host)}
      showInviteNotice={params.invites === "1"}
    />
  );
}
