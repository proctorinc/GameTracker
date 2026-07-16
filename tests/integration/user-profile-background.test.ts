import { describe, expect, it } from "vitest";
import { createUserFixture } from "../fixtures/users";
import { withTestDatabase } from "../helpers/test-db";

describe("user profile background persistence", () => {
  it("does not persist Clerk avatar URLs when creating or updating users", async () => {
    await withTestDatabase(async () => {
      const { createUser, updateUser } = await import(
        "../../src/lib/db/store/user.store"
      );

      const created = await createUser({
        firstName: "Ada",
        avatarUrl: "https://img.clerk.com/example/avatar.png",
      });
      expect(created.avatarUrl).toBeNull();

      const user = await createUserFixture({
        avatarUrl: "/images/profiles/rocks.png",
      });
      expect(user.avatarUrl).toBe("/images/profiles/rocks.png");

      const updated = await updateUser(user.id, {
        avatarUrl: "https://img.clerk.com/another/avatar.png",
      });
      expect(updated?.avatarUrl).toBeNull();
    }, "user-profile-background-persistence");
  });
});
