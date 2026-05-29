import { describe, expect, it } from "vitest";
import { createSessionFixture } from "../../fixtures/auth";
import { createUserFixture } from "../../fixtures/users";
import { withTestDatabase } from "../../helpers/test-db";

describe("session.store integration", () => {
  it("creates, reads, and deletes sessions against a real SQLite database", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture();
      const { rawToken, session } = await createSessionFixture(user.id);

      const { getSessionByTokenHash, listSessions, deleteSessionByToken } =
        await import("../../../src/lib/db/store/session.store");
      const { hashTokenWithSecret } = await import("../../../src/lib/auth/tokens");

      const loaded = await getSessionByTokenHash(hashTokenWithSecret(rawToken));

      expect(loaded?.id).toBe(session.id);
      expect(loaded?.user.id).toBe(user.id);
      expect(await listSessions()).toHaveLength(1);

      await deleteSessionByToken(hashTokenWithSecret(rawToken));
      expect(await listSessions()).toHaveLength(0);
    }, "session-store");
  });
});
