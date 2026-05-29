import { DashboardPageView } from "./_components/dashboard-page";
import { getDashboardOverviewPageData } from "./_components/page-data";

export default async function DashboardPage() {
  const data = await getDashboardOverviewPageData();

  return <DashboardPageView data={data} />;
}
