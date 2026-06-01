import { ProfileOverviewPage } from "./_components/overview/profile-overview-page";
import { getProfileOverviewPageData } from "./_components/overview/page-data";

export default async function ProfilePage() {
  const data = await getProfileOverviewPageData();

  return <ProfileOverviewPage initialData={data} />;
}
