import { notFound } from "next/navigation";
import { AdminAnnouncementEditor } from "@/components/admin/admin-announcement-editor";
import { getAnnouncementById } from "@/lib/db/store/announcement.store";
import { requireAdminPageUser } from "../../admin-guard";

export default async function EditAnnouncementPage({ params }: { params: Promise<{ announcementId: string }> }) {
  await requireAdminPageUser();
  const { announcementId } = await params;
  const announcement = await getAnnouncementById(announcementId);
  if (!announcement) notFound();

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div><h1 className="text-4xl font-black">Edit announcement</h1><p className="text-sm text-muted-foreground">Review the update and control its release.</p></div>
        <AdminAnnouncementEditor announcement={announcement} />
      </div>
    </div>
  );
}
