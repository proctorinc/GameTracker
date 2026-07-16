"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, useTransition } from "react";
import { Archive, ImagePlus, LoaderCircle, Megaphone, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  archiveAnnouncementAction,
  createAnnouncementDraftAction,
  publishAnnouncementAction,
  updateAnnouncementDraftAction,
} from "@/app/actions/announcements";
import {
  ANNOUNCEMENT_DETAILS_MAX_LENGTH,
  ANNOUNCEMENT_TITLE_MAX_LENGTH,
} from "@/lib/announcement-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Announcement } from "@/lib/db/store/announcement.store";

export function AdminAnnouncementEditor({
  announcement,
}: {
  announcement?: Announcement;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [details, setDetails] = useState(announcement?.details ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [removeScreenshot, setRemoveScreenshot] = useState(false);
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  const isPublished = Boolean(announcement?.publishedAt);
  const isArchived = Boolean(announcement?.archivedAt);
  const isEditable = !isPublished && !isArchived;
  const hasUnsavedChanges = Boolean(
    announcement &&
      (title !== announcement.title ||
        details !== announcement.details ||
        file ||
        removeScreenshot),
  );
  const visibleScreenshot = removeScreenshot
    ? null
    : (previewUrl ?? announcement?.screenshotUrl ?? null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function buildFormData() {
    const formData = new FormData();
    formData.set("title", title);
    formData.set("details", details);
    if (announcement) formData.set("announcementId", announcement.id);
    if (file) formData.set("screenshot", file);
    if (removeScreenshot) formData.set("removeScreenshot", "true");
    return formData;
  }

  function saveDraft() {
    startTransition(async () => {
      try {
        if (announcement) {
          await updateAnnouncementDraftAction(buildFormData());
          setFile(null);
          setRemoveScreenshot(false);
          toast.success("Draft saved");
          router.refresh();
        } else {
          const created = await createAnnouncementDraftAction(buildFormData());
          toast.success("Draft created");
          router.push(`/admin/announcements/${created.id}`);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save draft");
      }
    });
  }

  function publishDraft() {
    if (!announcement) return;
    startTransition(async () => {
      try {
        await publishAnnouncementAction({ announcementId: announcement.id });
        toast.success("Announcement published");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not publish announcement");
      }
    });
  }

  function archivePublished() {
    if (!announcement) return;
    if (!window.confirm("Archive this announcement and stop showing it to users?")) {
      return;
    }
    startTransition(async () => {
      try {
        await archiveAnnouncementAction({ announcementId: announcement.id });
        toast.success("Announcement archived");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not archive announcement");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{announcement ? "Announcement" : "New announcement"}</CardTitle>
            <Badge variant={isArchived ? "outline" : isPublished ? "default" : "secondary"}>
              {isArchived ? "Archived" : isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="announcement-title">Title</Label>
            <Input
              disabled={!isEditable || isPending}
              id="announcement-title"
              maxLength={ANNOUNCEMENT_TITLE_MAX_LENGTH}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="New profile backgrounds"
              value={title}
            />
            <p className="text-xs text-muted-foreground">{title.length}/{ANNOUNCEMENT_TITLE_MAX_LENGTH}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-details">Details</Label>
            <Textarea
              className="min-h-52"
              disabled={!isEditable || isPending}
              id="announcement-details"
              maxLength={ANNOUNCEMENT_DETAILS_MAX_LENGTH}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Tell users what changed and where to find it."
              value={details}
            />
            <p className="text-xs text-muted-foreground">{details.length.toLocaleString()}/{ANNOUNCEMENT_DETAILS_MAX_LENGTH.toLocaleString()}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-screenshot">Screenshot (optional)</Label>
            <Input
              accept="image/*"
              disabled={!isEditable || isPending}
              id="announcement-screenshot"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setRemoveScreenshot(false);
              }}
              type="file"
            />
            <p className="text-xs text-muted-foreground">Images are converted to WebP and limited to 8 MB.</p>
            {announcement?.screenshotUrl && isEditable && !removeScreenshot ? (
              <Button onClick={() => { setFile(null); setRemoveScreenshot(true); }} size="sm" type="button" variant="outline">
                Remove screenshot
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3 border-t pt-5">
            {isEditable ? (
              <Button disabled={isPending} onClick={saveDraft} type="button">
                {isPending ? <LoaderCircle className="animate-spin" /> : null}
                {announcement ? "Save draft" : "Create draft"}
              </Button>
            ) : null}
            {announcement && !isPublished && !isArchived ? (
              <Button disabled={isPending || hasUnsavedChanges} onClick={publishDraft} type="button" variant="outline">
                <Send /> Publish
              </Button>
            ) : null}
            {announcement && isPublished && !isArchived ? (
              <Button disabled={isPending} onClick={archivePublished} type="button" variant="destructive">
                <Archive /> Archive
              </Button>
            ) : null}
          </div>
          {isPublished ? (
            <p className="text-xs text-muted-foreground">Published announcements are immutable so acknowledged content cannot change.</p>
          ) : null}
          {hasUnsavedChanges ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">Save this draft before publishing it.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="h-fit overflow-hidden">
        {visibleScreenshot ? (
          <img alt="Announcement preview" className="max-h-72 w-full border-b bg-muted/40 object-contain" src={visibleScreenshot} />
        ) : (
          <div className="flex h-40 items-center justify-center border-b bg-muted/30 text-muted-foreground">
            <ImagePlus className="size-10" />
          </div>
        )}
        <CardHeader>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What&apos;s new · 1 of 1</div>
          <CardTitle className="text-2xl font-black">{title.trim() || "Announcement title"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap leading-6 text-foreground/80">
            {details.trim() || "Announcement details will appear here."}
          </p>
          <Button className="mt-6 w-full" disabled type="button"><Megaphone /> Got it</Button>
        </CardContent>
      </Card>
    </div>
  );
}
