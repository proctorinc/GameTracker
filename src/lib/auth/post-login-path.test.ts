import { describe, expect, it } from "vitest";
import { getPostLoginPath } from "./post-login-path";

describe("getPostLoginPath", () => {
  it("sends users with pending invitations to the profile friends tab when using the default return path", () => {
    expect(
      getPostLoginPath({
        requestedPath: undefined,
        hasPendingInvitations: true,
      }),
    ).toBe("/profile?tab=friends&invites=1");
  });

  it("preserves an explicit requested path even if there are invitations", () => {
    expect(
      getPostLoginPath({
        requestedPath: "/game/abc",
        hasPendingInvitations: true,
      }),
    ).toBe("/game/abc");
  });

  it("uses the default dashboard path when there are no invitations", () => {
    expect(
      getPostLoginPath({
        requestedPath: undefined,
        hasPendingInvitations: false,
      }),
    ).toBe("/dashboard");
  });
});
