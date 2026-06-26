import { describe, expect, it } from "vitest";
import { createUserFixture } from "../fixtures/users";
import { withTestDatabase } from "../helpers/test-db";

describe("game title access", () => {
  it("lets admins load a custom title page for a title they do not own", async () => {
    await withTestDatabase(async () => {
      const admin = await createUserFixture({ role: "admin" });
      const owner = await createUserFixture();

      const { db, gameTitle } = await import("../../src/lib/db");
      const { getGameTitleStatsPageData } = await import(
        "../../src/lib/db/store/game.store"
      );

      const [title] = await db
        .insert(gameTitle)
        .values({
          title: "Owner Custom Title",
          normalizedTitle: "owner custom title",
          color: "#123456",
          isUniversal: false,
          createdByUserId: owner.id,
        })
        .returning();

      expect(title).toBeTruthy();

      const data = await getGameTitleStatsPageData({
        userId: admin.id,
        gameTitleId: title!.id,
        allowAdminAccess: true,
      });

      expect(data).not.toBeNull();
      expect(data?.title.id).toBe(title!.id);
      expect(data?.title.createdByUserId).toBe(owner.id);
    }, "game-title-access-admin-custom-title");
  });

  it("keeps non-owner non-admins blocked from custom title pages", async () => {
    await withTestDatabase(async () => {
      const owner = await createUserFixture();
      const viewer = await createUserFixture();

      const { db, gameTitle } = await import("../../src/lib/db");
      const { getGameTitleStatsPageData } = await import(
        "../../src/lib/db/store/game.store"
      );

      const [title] = await db
        .insert(gameTitle)
        .values({
          title: "Private Custom Title",
          normalizedTitle: "private custom title",
          color: "#654321",
          isUniversal: false,
          createdByUserId: owner.id,
        })
        .returning();

      expect(title).toBeTruthy();

      const data = await getGameTitleStatsPageData({
        userId: viewer.id,
        gameTitleId: title!.id,
      });

      expect(data).toBeNull();
    }, "game-title-access-non-admin-custom-title");
  });
});
