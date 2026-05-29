import { afterEach, describe, expect, it, vi } from "vitest";
import { createSessionFixture } from "../../fixtures/auth";
import { createUserFixture } from "../../fixtures/users";
import { withTestDatabase } from "../../helpers/test-db";

function mockAuthenticatedCookies(rawToken: string) {
  vi.doMock("next/headers", () => ({
    cookies: async () => ({
      get: (name: string) =>
        name === "app_session" ? { value: rawToken } : undefined,
    }),
  }));

  vi.doMock("next/navigation", () => ({
    redirect: (location: string) => {
      throw new Error(`Unexpected redirect to ${location}`);
    },
  }));
}

describe("server action integration", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("creates a phone invitation for the authenticated user", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture();
      const { rawToken } = await createSessionFixture(user.id, "invite-token");

      mockAuthenticatedCookies(rawToken);
      const revalidatePath = vi.fn();
      vi.doMock("next/cache", () => ({
        revalidatePath,
      }));

      const { createFriendInvitationByPhone } = await import("../../../src/app/actions/friends");

      const formData = new FormData();
      formData.set("phoneNumber", "15554443333");

      const result = await createFriendInvitationByPhone(formData);
      expect(result.targetType).toBe("phone");

      const { getInvitationById } = await import("../../../src/lib/db/store/invitation.store");
      const invitation = await getInvitationById(result.invitationId);

      expect(invitation?.inviteePhoneNumber).toBe("+15554443333");
      expect(revalidatePath).toHaveBeenCalledWith("/friends");
    }, "friends-action");
  });

  it("creates a configured game and adds the current user as a player", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture();
      const { rawToken } = await createSessionFixture(user.id, "game-token");

      mockAuthenticatedCookies(rawToken);

      const { createConfiguredGame } = await import("../../../src/app/actions/game");

      const createdGame = await createConfiguredGame({
        gameTitleName: "Skybo Test Title",
        scoringMode: "highest_wins",
        endingMode: "round_count",
        targetRounds: 5,
      });

      const { getGameById, listGameTitles } = await import("../../../src/lib/db/store/game.store");
      const persistedGame = await getGameById(createdGame.id);
      const titles = await listGameTitles(user.id);

      expect(persistedGame?.creatorId).toBe(user.id);
      expect(persistedGame?.players).toHaveLength(1);
      expect(persistedGame?.targetRounds).toBe(5);
      expect(titles.some((title) => title.title === "Skybo Test Title")).toBe(true);
    }, "game-action");
  });
});
