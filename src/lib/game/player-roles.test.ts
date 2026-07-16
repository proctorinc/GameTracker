import { describe, expect, it } from "vitest";
import {
  canRoleEditScore,
  getEffectiveGamePlayerRole,
  getStoredGamePlayerRole,
} from "./player-roles";

describe("game player roles", () => {
  it("uses the legacy manager flag when an explicit role is absent", () => {
    expect(getStoredGamePlayerRole({ isManager: true, role: null })).toBe(
      "manager",
    );
    expect(getStoredGamePlayerRole({ isManager: false, role: null })).toBe(
      "player",
    );
  });

  it("always resolves the game owner as creator", () => {
    expect(
      getEffectiveGamePlayerRole({
        creatorId: "user-1",
        player: { isManager: false, role: "player" },
        userId: "user-1",
      }),
    ).toBe("creator");
  });

  it("limits self scorers to their own score", () => {
    expect(
      canRoleEditScore({
        actorUserId: "user-1",
        role: "self_scorer",
        targetUserId: "user-1",
      }),
    ).toBe(true);
    expect(
      canRoleEditScore({
        actorUserId: "user-1",
        role: "self_scorer",
        targetUserId: "user-2",
      }),
    ).toBe(false);
    expect(
      canRoleEditScore({
        actorUserId: "user-1",
        role: "player",
        targetUserId: "user-1",
      }),
    ).toBe(false);
  });
});
