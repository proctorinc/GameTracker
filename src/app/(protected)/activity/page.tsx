import { ActivityPageView } from "./_components/activity-page";
import { getActivityPageData } from "./_components/page-data";

function selectInitialActivityTab(input?: {
  tab?: string | null;
}): "activity" | "leaderboard" {
  if (input?.tab === "leaderboard") {
    return "leaderboard";
  }

  return "activity";
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const data = await getActivityPageData();
  const resolvedSearchParams = await searchParams;
  const initialTab = selectInitialActivityTab(resolvedSearchParams);

  return <ActivityPageView data={data} initialTab={initialTab} />;
}
