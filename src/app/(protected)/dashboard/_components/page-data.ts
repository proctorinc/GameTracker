import "server-only";

import { getDashboardPageData } from "@/app/actions/pages/dashboard";

export async function getDashboardOverviewPageData() {
  return getDashboardPageData();
}
