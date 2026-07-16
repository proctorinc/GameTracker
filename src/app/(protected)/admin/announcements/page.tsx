import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
                <Link href={`/admin/announcements/${announcement.id}`} key={announcement.id}>
                  <Card className="transition-transform hover:-translate-y-0.5">
                    <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <CardTitle>{announcement.title}</CardTitle>
                        <p className="line-clamp-2 text-sm text-muted-foreground">{announcement.details}</p>
                      </div>
                      <Badge variant={status === "Published" ? "default" : "outline"}>{status}</Badge>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      {announcement.publishedAt ? `Published ${formatDate(announcement.publishedAt)}` : `Created ${formatDate(announcement.createdAt)}`}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
