import { afterEach, describe, expect, it, vi } from "vitest";
import { createUserFixture } from "../fixtures/users";
import { withTestDatabase } from "../helpers/test-db";

describe("announcement store", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("lists viewed and unviewed announcements published within the recent window", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture();
      const { announcementAcknowledgments, announcements, db } = await import(
        "../../src/lib/db"
      );
      const { listRecentAnnouncements } = await import(
        "../../src/lib/db/store/announcement.store"
      );

      await db.insert(announcements).values([
        {
          id: "recent-viewed",
          title: "Recent viewed announcement",
          details: "Already viewed",
          publishedAt: "2026-07-15T12:00:00.000Z",
        },
        {
          id: "recent-unviewed",
          title: "Recent unviewed announcement",
          details: "Not viewed yet",
          publishedAt: "2026-07-10T12:00:00.000Z",
        },
        {
          id: "window-boundary",
          title: "Announcement at the cutoff",
          details: "Exactly thirty days old",
          publishedAt: "2026-06-22T12:00:00.000Z",
        },
        {
          id: "too-old",
          title: "Old announcement",
          details: "Outside the recent window",
          publishedAt: "2026-06-22T11:59:59.999Z",
        },
        {
          id: "recent-archived",
          title: "Archived announcement",
          details: "No longer available",
          publishedAt: "2026-07-12T12:00:00.000Z",
          archivedAt: "2026-07-13T12:00:00.000Z",
        },
        {
          id: "draft",
          title: "Draft announcement",
          details: "Not published",
        },
      ]);
      await db.insert(announcementAcknowledgments).values({
        announcementId: "recent-viewed",
        userId: user.id,
        acknowledgedAt: "2026-07-16T12:00:00.000Z",
      });

      const recent = await listRecentAnnouncements({
        since: "2026-06-22T12:00:00.000Z",
      });

      expect(recent.map((announcement) => announcement.id)).toEqual([
        "recent-viewed",
        "recent-unviewed",
        "window-boundary",
      ]);
    }, "announcement-history");
  });
});
