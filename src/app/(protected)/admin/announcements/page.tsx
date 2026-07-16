import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAnnouncementResetButton } from "@/components/admin/admin-announcement-reset-button";
import { listAnnouncementsForAdmin } from "@/lib/db/store/announcement.store";
import { requireAdminPageUser } from "../admin-guard";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function AdminAnnouncementsPage() {
  await requireAdminPageUser();
  const announcements = await listAnnouncementsForAdmin();

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-black">Announcements</h1>
            <p className="text-sm text-muted-foreground">Write, preview, and publish updates for existing users.</p>
          </div>
          <Button render={<Link href="/admin/announcements/new" />}><Plus /> New announcement</Button>
        </div>

        {announcements.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No announcements yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {announcements.map((announcement) => {
              const status = announcement.archivedAt ? "Archived" : announcement.publishedAt ? "Published" : "Draft";
              return (
                <Card key={announcement.id}>
                  <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <CardTitle>
                        <Link
                          className="hover:underline"
                          href={`/admin/announcements/${announcement.id}`}
                        >
                          {announcement.title}
                        </Link>
                      </CardTitle>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{announcement.details}</p>
                    </div>
                    <Badge variant={status === "Published" ? "default" : "outline"}>{status}</Badge>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      {announcement.publishedAt ? `Published ${formatDate(announcement.publishedAt)}` : `Created ${formatDate(announcement.createdAt)}`}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <AdminAnnouncementResetButton
                        announcementId={announcement.id}
                        disabled={!announcement.publishedAt || Boolean(announcement.archivedAt)}
                      />
                      <Button
                        render={<Link href={`/admin/announcements/${announcement.id}`} />}
                        size="sm"
                        variant="outline"
                      >
                        Open
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
