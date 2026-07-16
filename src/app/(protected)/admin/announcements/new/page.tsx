import { AdminAnnouncementEditor } from "@/components/admin/admin-announcement-editor";
import { requireAdminPageUser } from "../../admin-guard";

export default async function NewAnnouncementPage() {
  await requireAdminPageUser();
  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div><h1 className="text-4xl font-black">New announcement</h1><p className="text-sm text-muted-foreground">Save a draft and preview exactly what users will see.</p></div>
        <AdminAnnouncementEditor />
      </div>
    </div>
  );
}
