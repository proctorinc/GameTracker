"use server";

import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import { prepareAnnouncementImage } from "@/lib/announcement-image";
import {
  ANNOUNCEMENT_ACTION_LABEL_MAX_LENGTH,
  ANNOUNCEMENT_DETAILS_MAX_LENGTH,
  ANNOUNCEMENT_TITLE_MAX_LENGTH,
} from "@/lib/announcement-content";
import {
  acknowledgeAnnouncementForUser,
  archiveAnnouncement,
  createAnnouncementDraft,
  getAnnouncementById,
  publishAnnouncement,
  resetAnnouncementAcknowledgmentForUser,
  updateAnnouncementDraft,
} from "@/lib/db/store/announcement.store";
import { uploadAnnouncementImageToS3 } from "@/lib/title-image-storage";

async function requireAdminUser() {
  const user = await loadCurrentUser();

  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

function getFormDataString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validateContent(input: { title: string; details: string }) {
  const title = input.title.trim();
  const details = input.details.trim();

  if (!title) {
    throw new Error("Title is required");
  }
  if (title.length > ANNOUNCEMENT_TITLE_MAX_LENGTH) {
    throw new Error("Title must be 120 characters or fewer");
  }
  if (!details) {
    throw new Error("Details are required");
  }
  if (details.length > ANNOUNCEMENT_DETAILS_MAX_LENGTH) {
    throw new Error("Details must be 5,000 characters or fewer");
  }

  return { title, details };
}

function validateAction(input: { actionLabel: string; actionHref: string }) {
  const actionLabel = input.actionLabel.trim();
  const actionHref = input.actionHref.trim();

  if (!actionLabel && !actionHref) {
    return { actionLabel: null, actionHref: null };
  }
  if (!actionLabel || !actionHref) {
    throw new Error("Navigation button label and destination are both required");
  }
  if (actionLabel.length > ANNOUNCEMENT_ACTION_LABEL_MAX_LENGTH) {
    throw new Error("Navigation button label must be 80 characters or fewer");
  }
  if (!actionHref.startsWith("/") || actionHref.startsWith("//")) {
    throw new Error("Navigation destination must be an internal path");
  }

  return { actionLabel, actionHref };
}

async function uploadScreenshot(
  announcementId: string,
  fileEntry: FormDataEntryValue | null,
) {
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return null;
  }

  const prepared = await prepareAnnouncementImage({
    buffer: Buffer.from(await fileEntry.arrayBuffer()),
    mimeType: fileEntry.type,
  });

  return uploadAnnouncementImageToS3({
    announcementId,
    buffer: prepared.buffer,
    contentType: prepared.contentType,
  });
}

function revalidateAnnouncementAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/announcements");
}

export async function createAnnouncementDraftAction(formData: FormData) {
  const admin = await requireAdminUser();
  const content = validateContent({
    title: getFormDataString(formData, "title"),
    details: getFormDataString(formData, "details"),
  });
  const action = validateAction({
    actionLabel: getFormDataString(formData, "actionLabel"),
    actionHref: getFormDataString(formData, "actionHref"),
  });
  const announcementId = createId();
  const screenshotUrl = await uploadScreenshot(
    announcementId,
    formData.get("screenshot"),
  );
  const announcement = await createAnnouncementDraft({
    id: announcementId,
    ...content,
    ...action,
    screenshotUrl,
    createdByUserId: admin.id,
  });

  revalidateAnnouncementAdmin();
  return announcement;
}

export async function updateAnnouncementDraftAction(formData: FormData) {
  await requireAdminUser();
  const announcementId = getFormDataString(formData, "announcementId").trim();
  const content = validateContent({
    title: getFormDataString(formData, "title"),
    details: getFormDataString(formData, "details"),
  });
  const action = validateAction({
    actionLabel: getFormDataString(formData, "actionLabel"),
    actionHref: getFormDataString(formData, "actionHref"),
  });

  if (!announcementId) {
    throw new Error("Announcement id is required");
  }

  const existing = await getAnnouncementById(announcementId);
  if (!existing) {
    throw new Error("Announcement not found");
  }
  if (existing.publishedAt) {
    throw new Error("Published announcements cannot be edited");
  }
  if (existing.archivedAt) {
    throw new Error("Archived announcements cannot be edited");
  }

  const uploadedScreenshotUrl = await uploadScreenshot(
    announcementId,
    formData.get("screenshot"),
  );
  const removeScreenshot = getFormDataString(formData, "removeScreenshot") === "true";
  const announcement = await updateAnnouncementDraft({
    announcementId,
    ...content,
    ...action,
    screenshotUrl: removeScreenshot
      ? null
      : (uploadedScreenshotUrl ?? existing.screenshotUrl),
  });

  if (!announcement) {
    throw new Error("Announcement could not be updated");
  }

  revalidateAnnouncementAdmin();
  revalidatePath(`/admin/announcements/${announcementId}`);
  return announcement;
}

export async function publishAnnouncementAction(input: {
  announcementId: string;
}) {
  await requireAdminUser();
  const announcement = await getAnnouncementById(input.announcementId);

  if (!announcement) {
    throw new Error("Announcement not found");
  }
  validateContent(announcement);
  if (announcement.publishedAt) {
    throw new Error("Announcement has already been published");
  }
  if (announcement.archivedAt) {
    throw new Error("Archived announcements cannot be published");
  }

  const published = await publishAnnouncement(input.announcementId);
  if (!published) {
    throw new Error("Announcement could not be published");
  }

  revalidateAnnouncementAdmin();
  revalidatePath("/", "layout");
  return published;
}

export async function archiveAnnouncementAction(input: {
  announcementId: string;
}) {
  await requireAdminUser();
  const existing = await getAnnouncementById(input.announcementId);

  if (!existing) {
    throw new Error("Announcement not found");
  }
  if (!existing.publishedAt) {
    throw new Error("Only published announcements can be archived");
  }
  if (existing.archivedAt) {
    throw new Error("Announcement has already been archived");
  }

  const archived = await archiveAnnouncement(input.announcementId);
  if (!archived) {
    throw new Error("Announcement could not be archived");
  }

  revalidateAnnouncementAdmin();
  revalidatePath("/", "layout");
  return archived;
}

export async function acknowledgeAnnouncementAction(input: {
  announcementId: string;
}) {
  const user = await loadCurrentUser();
  const acknowledged = await acknowledgeAnnouncementForUser({
    announcementId: input.announcementId,
    userId: user.id,
    userCreatedAt: user.createdAt,
    isGuest: user.isGuest,
    mergedIntoUserId: user.mergedIntoUserId,
  });

  if (!acknowledged) {
    throw new Error("Announcement is not available");
  }

  return { acknowledged: true as const };
}

export async function resetAnnouncementAcknowledgmentAction(input: {
  announcementId: string;
}) {
  const admin = await requireAdminUser();
  const announcement = await getAnnouncementById(input.announcementId);

  if (!announcement) {
    throw new Error("Announcement not found");
  }
  if (!announcement.publishedAt || announcement.archivedAt) {
    throw new Error("Only active published announcements can be marked unseen");
  }

  const reset = await resetAnnouncementAcknowledgmentForUser({
    announcementId: input.announcementId,
    userId: admin.id,
  });

  revalidateAnnouncementAdmin();
  revalidatePath("/", "layout");
  return { reset };
}
