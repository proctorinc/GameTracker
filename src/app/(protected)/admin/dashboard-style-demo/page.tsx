import { getDashboardOverviewPageData } from "@/app/(protected)/dashboard/_components/page-data";
import { DashboardStyleDemoView } from "@/app/(protected)/dashboard/_components/dashboard-style-demo";
import { requireAdminPageUser } from "../admin-guard";

export default async function AdminDashboardStyleDemoPage() {
  await requireAdminPageUser();
  const data = await getDashboardOverviewPageData();

  return <DashboardStyleDemoView data={data} />;
}
