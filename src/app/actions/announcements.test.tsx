import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadCurrentUser: vi.fn(),
  acknowledgeAnnouncementForUser: vi.fn(),
  archiveAnnouncement: vi.fn(),
  createAnnouncementDraft: vi.fn(),
  getAnnouncementById: vi.fn(),
  publishAnnouncement: vi.fn(),
  updateAnnouncementDraft: vi.fn(),
  prepareAnnouncementImage: vi.fn(),
  uploadAnnouncementImageToS3: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@paralleldrive/cuid2", () => ({ createId: () => "announcement-new" }));
vi.mock("@/lib/auth/auth-me", () => ({ loadCurrentUser: mocks.loadCurrentUser }));
vi.mock("@/lib/announcement-image", () => ({
  prepareAnnouncementImage: mocks.prepareAnnouncementImage,
}));
vi.mock("@/lib/db/store/announcement.store", () => ({
  acknowledgeAnnouncementForUser: mocks.acknowledgeAnnouncementForUser,
  archiveAnnouncement: mocks.archiveAnnouncement,
  createAnnouncementDraft: mocks.createAnnouncementDraft,
  getAnnouncementById: mocks.getAnnouncementById,
  publishAnnouncement: mocks.publishAnnouncement,
  updateAnnouncementDraft: mocks.updateAnnouncementDraft,
}));
vi.mock("@/lib/title-image-storage", () => ({
  uploadAnnouncementImageToS3: mocks.uploadAnnouncementImageToS3,
}));

import {
  acknowledgeAnnouncementAction,
  createAnnouncementDraftAction,
  publishAnnouncementAction,
} from "./announcements";

const admin = {
  id: "admin-1",
  role: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
  isGuest: false,
  mergedIntoUserId: null,
};

function validFormData() {
  const formData = new FormData();
  formData.set("title", "Profile backgrounds");
  formData.set("details", "Choose a new profile background.");
  return formData;
}

describe("announcement actions", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.loadCurrentUser.mockResolvedValue(admin);
  });

  it("requires an admin and validates draft content", async () => {
    mocks.loadCurrentUser.mockResolvedValueOnce({ ...admin, role: "user" });
    await expect(createAnnouncementDraftAction(validFormData())).rejects.toThrow(
      "Admin access required",
    );

    const invalid = validFormData();
    invalid.set("title", " ");
    await expect(createAnnouncementDraftAction(invalid)).rejects.toThrow(
      "Title is required",
    );
    expect(mocks.createAnnouncementDraft).not.toHaveBeenCalled();
  });

  it("creates a validated draft for the current admin", async () => {
    mocks.createAnnouncementDraft.mockResolvedValue({ id: "announcement-new" });

    await createAnnouncementDraftAction(validFormData());

    expect(mocks.createAnnouncementDraft).toHaveBeenCalledWith({
      id: "announcement-new",
      title: "Profile backgrounds",
      details: "Choose a new profile background.",
      actionLabel: null,
      actionHref: null,
      screenshotUrl: null,
      createdByUserId: "admin-1",
    });
  });

  it("validates and persists an optional internal navigation action", async () => {
    const formData = validFormData();
    formData.set("actionLabel", "View backgrounds");
    formData.set("actionHref", "/profile/backgrounds");
    mocks.createAnnouncementDraft.mockResolvedValue({ id: "announcement-new" });

    await createAnnouncementDraftAction(formData);

    expect(mocks.createAnnouncementDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        actionLabel: "View backgrounds",
        actionHref: "/profile/backgrounds",
      }),
    );

    formData.set("actionHref", "https://example.com");
    await expect(createAnnouncementDraftAction(formData)).rejects.toThrow(
      "internal path",
    );
  });

  it("uploads a draft image to S3 and persists the returned public URL", async () => {
    const source = new File(["source-image"], "announcement.png", {
      type: "image/png",
    });
    const preparedBuffer = Buffer.from("prepared-webp");
    const formData = validFormData();
    formData.set("screenshot", source);
    mocks.prepareAnnouncementImage.mockResolvedValue({
      buffer: preparedBuffer,
      contentType: "image/webp",
    });
    mocks.uploadAnnouncementImageToS3.mockResolvedValue(
      "https://assets.example.com/announcements/announcement-new/image.webp",
    );
    mocks.createAnnouncementDraft.mockResolvedValue({ id: "announcement-new" });

    await createAnnouncementDraftAction(formData);

    expect(mocks.prepareAnnouncementImage).toHaveBeenCalledWith({
      buffer: Buffer.from("source-image"),
      mimeType: "image/png",
    });
    expect(mocks.uploadAnnouncementImageToS3).toHaveBeenCalledWith({
      announcementId: "announcement-new",
      buffer: preparedBuffer,
      contentType: "image/webp",
    });
    expect(mocks.createAnnouncementDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        screenshotUrl:
          "https://assets.example.com/announcements/announcement-new/image.webp",
      }),
    );
  });

  it("does not allow an already-published announcement to be republished", async () => {
    mocks.getAnnouncementById.mockResolvedValue({
      id: "announcement-1",
      title: "Released",
      details: "Already visible.",
      publishedAt: "2026-07-16T00:00:00.000Z",
      archivedAt: null,
    });

    await expect(
      publishAnnouncementAction({ announcementId: "announcement-1" }),
    ).rejects.toThrow("already been published");
    expect(mocks.publishAnnouncement).not.toHaveBeenCalled();
  });

  it("acknowledges only through the authenticated user's eligibility", async () => {
    mocks.acknowledgeAnnouncementForUser.mockResolvedValue(true);

    await expect(
      acknowledgeAnnouncementAction({ announcementId: "announcement-1" }),
    ).resolves.toEqual({ acknowledged: true });
    expect(mocks.acknowledgeAnnouncementForUser).toHaveBeenCalledWith({
      announcementId: "announcement-1",
      userId: "admin-1",
      userCreatedAt: admin.createdAt,
      isGuest: false,
      mergedIntoUserId: null,
    });
  });
});
