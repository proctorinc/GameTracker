import { ProfileOverviewPage } from "./_components/overview/profile-overview-page";
import { getProfileOverviewPageData } from "./_components/overview/page-data";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; invites?: string }>;
}) {
  const params = await searchParams;
  const data = await getProfileOverviewPageData(params);

  return <ProfileOverviewPage initialData={data} />;
}
