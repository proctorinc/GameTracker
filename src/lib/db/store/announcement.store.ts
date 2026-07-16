import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
} from "drizzle-orm";
import {
  announcementAcknowledgments,
  announcements,
  db,
} from "../index";

export type Announcement = typeof announcements.$inferSelect;
export type AnnouncementDraftInput = Pick<
  typeof announcements.$inferInsert,
  "id" | "title" | "details" | "screenshotUrl" | "createdByUserId"
>;

export type AnnouncementForClient = Pick<
  Announcement,
  "id" | "title" | "details" | "screenshotUrl" | "publishedAt"
>;

function nowIso() {
  return new Date().toISOString();
}

export async function createAnnouncementDraft(
  input: AnnouncementDraftInput,
): Promise<Announcement> {
  const now = nowIso();
  const [announcement] = await db
    .insert(announcements)
    .values({
      ...input,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return announcement;
}

export async function getAnnouncementById(
  announcementId: string,
): Promise<Announcement | null> {
  const announcement = await db.query.announcements.findFirst({
    where: eq(announcements.id, announcementId),
  });

  return announcement ?? null;
}

export async function listAnnouncementsForAdmin(): Promise<Announcement[]> {
  return db.query.announcements.findMany({
    orderBy: [desc(announcements.createdAt)],
  });
}

export async function updateAnnouncementDraft(input: {
  announcementId: string;
  title: string;
  details: string;
  screenshotUrl: string | null;
}): Promise<Announcement | null> {
  const [announcement] = await db
    .update(announcements)
    .set({
      title: input.title,
      details: input.details,
      screenshotUrl: input.screenshotUrl,
      updatedAt: nowIso(),
    })
    .where(
      and(
        eq(announcements.id, input.announcementId),
        isNull(announcements.publishedAt),
        isNull(announcements.archivedAt),
      ),
    )
    .returning();

  return announcement ?? null;
}

export async function publishAnnouncement(
  announcementId: string,
): Promise<Announcement | null> {
  const now = nowIso();
  const [announcement] = await db
    .update(announcements)
    .set({ publishedAt: now, updatedAt: now })
    .where(
      and(
        eq(announcements.id, announcementId),
        isNull(announcements.publishedAt),
        isNull(announcements.archivedAt),
      ),
    )
    .returning();

  return announcement ?? null;
}

export async function archiveAnnouncement(
  announcementId: string,
): Promise<Announcement | null> {
  const now = nowIso();
  const [announcement] = await db
    .update(announcements)
    .set({ archivedAt: now, updatedAt: now })
    .where(
      and(
        eq(announcements.id, announcementId),
        isNull(announcements.archivedAt),
      ),
    )
    .returning();

  return announcement ?? null;
}

export async function listUnseenAnnouncementsForUser(input: {
  userId: string;
  userCreatedAt: string | null;
  isGuest: boolean;
  mergedIntoUserId: string | null;
}): Promise<AnnouncementForClient[]> {
  if (input.isGuest || input.mergedIntoUserId) {
    return [];
  }

  const conditions = [
    isNotNull(announcements.publishedAt),
    isNull(announcements.archivedAt),
    isNull(announcementAcknowledgments.announcementId),
  ];

  if (input.userCreatedAt) {
    conditions.push(gte(announcements.publishedAt, input.userCreatedAt));
  }

  return db
    .select({
      id: announcements.id,
      title: announcements.title,
      details: announcements.details,
      screenshotUrl: announcements.screenshotUrl,
      publishedAt: announcements.publishedAt,
    })
    .from(announcements)
    .leftJoin(
      announcementAcknowledgments,
      and(
        eq(announcementAcknowledgments.announcementId, announcements.id),
        eq(announcementAcknowledgments.userId, input.userId),
      ),
    )
    .where(and(...conditions))
    .orderBy(asc(announcements.publishedAt));
}

export async function acknowledgeAnnouncementForUser(input: {
  announcementId: string;
  userId: string;
  userCreatedAt: string | null;
  isGuest: boolean;
  mergedIntoUserId: string | null;
}): Promise<boolean> {
  if (input.isGuest || input.mergedIntoUserId) {
    return false;
  }

  const conditions = [
    eq(announcements.id, input.announcementId),
    isNull(announcements.archivedAt),
    isNotNull(announcements.publishedAt),
  ];

  if (input.userCreatedAt) {
    conditions.push(gte(announcements.publishedAt, input.userCreatedAt));
  }

  const eligible = await db.query.announcements.findFirst({
    where: and(...conditions),
    columns: { id: true },
  });

  if (!eligible) {
    return false;
  }

  await db
    .insert(announcementAcknowledgments)
    .values({
      announcementId: input.announcementId,
      userId: input.userId,
      acknowledgedAt: nowIso(),
    })
    .onConflictDoNothing();

  return true;
}
