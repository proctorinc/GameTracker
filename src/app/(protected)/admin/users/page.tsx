import { AdminUsersPage } from "@/components/admin/admin-users-page";
import { requireAdminPageUser } from "../admin-guard";
import { getAdminUsersPageData } from "./page-data";

export default async function AdminUsersManagementPage() {
  await requireAdminPageUser();
  const data = await getAdminUsersPageData();

  return <AdminUsersPage data={data} />;
}
