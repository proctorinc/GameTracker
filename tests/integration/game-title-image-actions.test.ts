import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createUserFixture } from "../fixtures/users";
import { withTestDatabase } from "../helpers/test-db";

function mockProtectedSessionUser(userId: string) {
  vi.doMock("@/lib/auth/protected-session", () => ({
    loadUser: async () => {
      const { getUserById } = await import("@/lib/db/store/user.store");
      const user = await getUserById(userId);

      if (!user) {
        throw new Error(`Missing test user ${userId}`);
      }

      return { user };
    },
  }));
}

function mockRevalidateTag() {
  vi.doMock("next/cache", () => ({
    revalidateTag: vi.fn(),
  }));
}

async function createImageBuffer(color: { r: number; g: number; b: number }) {
  return sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toBuffer();
}

describe("game title image actions", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("allows an admin to upload title art to S3 and persist the returned URL", async () => {
    await withTestDatabase(async () => {
      const admin = await createUserFixture({ role: "admin" });
      mockProtectedSessionUser(admin.id);
      mockRevalidateTag();
      vi.doMock("@/lib/title-image-storage", () => ({
        uploadGameTitleImageToS3: vi
          .fn()
          .mockResolvedValue("https://cdn.example.com/game-titles/title-1/cover.webp"),
      }));

      const { db, gameTitle } = await import("../../src/lib/db");
      const { getGameTitleById } = await import(
        "../../src/lib/db/store/game.store"
      );
      const { saveUploadedGameTitleImage } = await import(
        "../../src/app/actions/game"
      );

      const [title] = await db
        .insert(gameTitle)
        .values({
          title: "Skyjo",
          normalizedTitle: "skyjo",
          color: "#475569",
          imageUrl: "/images/skyjo.png",
          isUniversal: true,
        })
        .returning();

      const formData = new FormData();
      formData.set("gameTitleId", title!.id);
      formData.set(
        "file",
        new File([await createImageBuffer({ r: 20, g: 40, b: 60 })], "cover.png", {
          type: "image/png",
        }),
      );

      await saveUploadedGameTitleImage(formData);

      const updatedTitle = await getGameTitleById(title!.id);
      expect(updatedTitle?.imageUrl).toBe(
        "https://cdn.example.com/game-titles/title-1/cover.webp",
      );
      expect(updatedTitle?.color).toMatch(/^#/);
    }, "game-title-image-upload");
  });

  it("rejects non-admin upload attempts", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture({ role: "user" });
      mockProtectedSessionUser(user.id);
      mockRevalidateTag();
      vi.doMock("@/lib/title-image-storage", () => ({
        uploadGameTitleImageToS3: vi.fn(),
      }));

      const { db, gameTitle } = await import("../../src/lib/db");
      const { saveUploadedGameTitleImage } = await import(
        "../../src/app/actions/game"
      );

      const [title] = await db
        .insert(gameTitle)
        .values({
          title: "Skyjo",
          normalizedTitle: "skyjo",
          color: "#475569",
          imageUrl: "/images/skyjo.png",
          isUniversal: false,
          createdByUserId: user.id,
        })
        .returning();

      const formData = new FormData();
      formData.set("gameTitleId", title!.id);
      formData.set(
        "file",
        new File([await createImageBuffer({ r: 60, g: 80, b: 100 })], "cover.png", {
          type: "image/png",
        }),
      );

      await expect(saveUploadedGameTitleImage(formData)).rejects.toThrow(
        /admin access required/i,
      );
    }, "game-title-image-upload-reject");
  });

  it("generates a preview without mutating the database", async () => {
    await withTestDatabase(async () => {
      const admin = await createUserFixture({ role: "admin" });
      mockProtectedSessionUser(admin.id);
      mockRevalidateTag();
      vi.doMock("@/lib/openai-title-image", () => ({
        generateGameTitleImageCandidate: vi.fn().mockResolvedValue({
          previewUrl: "data:image/webp;base64,generated",
          mimeType: "image/webp",
          width: 1536,
          height: 1024,
          color: "#0f766e",
          source: "openai",
          prompt: "custom prompt",
          model: "gpt-image-2",
        }),
      }));

      const { db, gameTitle } = await import("../../src/lib/db");
      const { getGameTitleById } = await import(
        "../../src/lib/db/store/game.store"
      );
      const { generateGameTitleImage } = await import(
        "../../src/app/actions/game"
      );

      const [title] = await db
        .insert(gameTitle)
        .values({
          title: "Skyjo",
          normalizedTitle: "skyjo",
          color: "#475569",
          imageUrl: "/images/skyjo.png",
          isUniversal: true,
        })
        .returning();

      const candidate = await generateGameTitleImage({
        gameTitleId: title!.id,
        gameName: "Skyjo Deluxe",
      });

      expect(candidate.previewUrl).toContain("data:image/webp;base64");
      expect(candidate.color).toBe("#0f766e");

      const unchangedTitle = await getGameTitleById(title!.id);
      expect(unchangedTitle?.imageUrl).toBe("/images/skyjo.png");
    }, "game-title-image-generate");
  });

  it("saves a generated preview to S3 when confirmed", async () => {
    await withTestDatabase(async () => {
      const admin = await createUserFixture({ role: "admin" });
      mockProtectedSessionUser(admin.id);
      mockRevalidateTag();
      vi.doMock("@/lib/title-image-storage", () => ({
        uploadGameTitleImageToS3: vi
          .fn()
          .mockResolvedValue("https://cdn.example.com/game-titles/title-1/generated.webp"),
      }));

      const { db, gameTitle } = await import("../../src/lib/db");
      const { getGameTitleById } = await import(
        "../../src/lib/db/store/game.store"
      );
      const { saveGeneratedGameTitleImage } = await import(
        "../../src/app/actions/game"
      );

      const [title] = await db
        .insert(gameTitle)
        .values({
          title: "Skyjo",
          normalizedTitle: "skyjo",
          color: "#475569",
          imageUrl: "/images/skyjo.png",
          isUniversal: true,
        })
        .returning();

      const generatedBuffer = await createImageBuffer({ r: 120, g: 80, b: 40 });

      await saveGeneratedGameTitleImage({
        gameTitleId: title!.id,
        previewUrl: `data:image/png;base64,${generatedBuffer.toString("base64")}`,
      });

      const updatedTitle = await getGameTitleById(title!.id);
      expect(updatedTitle?.imageUrl).toBe(
        "https://cdn.example.com/game-titles/title-1/generated.webp",
      );
      expect(updatedTitle?.color).toMatch(/^#/);
    }, "game-title-image-save-generated");
  });
});
