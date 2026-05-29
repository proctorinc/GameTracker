import { headers } from "next/headers";
import { getBaseUrl } from "../friends/_components/utils";
import { ProfileOverviewPage } from "./_components/overview/profile-overview-page";
import { getProfileOverviewPageData } from "./_components/overview/page-data";

export default async function ProfilePage() {
  const [data, headerStore] = await Promise.all([
    getProfileOverviewPageData(),
    headers(),
  ]);
  const publicProfileUrl = `${getBaseUrl(headerStore.get("host"))}/profile/${data.user.id}`;

  return (
    <ProfileOverviewPage
      initialData={data}
      publicProfileUrl={publicProfileUrl}
    />
  );
}
