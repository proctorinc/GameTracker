import { ActivityPageView } from "./_components/activity-page";
import { getActivityPageData } from "./_components/page-data";

export default async function ActivityPage() {
  const data = await getActivityPageData();

  return <ActivityPageView data={data} />;
}
