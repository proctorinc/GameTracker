import { afterEach, describe, expect, it, vi } from "vitest";
import { createSessionFixture } from "../../fixtures/auth";
import { createUserFixture } from "../../fixtures/users";
import { withTestDatabase } from "../../helpers/test-db";

describe("auth route integration", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("requests and verifies OTP with a real database-backed user/session flow", async () => {
    await withTestDatabase(async () => {
      const sendOtp = vi.fn().mockResolvedValue(undefined);
      const checkOtp = vi.fn().mockResolvedValue(true);

      vi.doMock("@/lib/twilio/service", () => ({
        resolveVerifyProvider: () => ({
          sendOtp,
          checkOtp,
        }),
      }));

      const { POST: requestOtp } = await import("../../../src/app/api/auth/otp/request/route");
      const requestResponse = await requestOtp(
        new Request("http://localhost:3000/api/auth/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: "15550009999" }),
        }),
      );

      expect(requestResponse.status).toBe(200);
      expect(sendOtp).toHaveBeenCalledWith("+15550009999");

      vi.resetModules();
      vi.doMock("@/lib/twilio/service", () => ({
        resolveVerifyProvider: () => ({
          sendOtp,
          checkOtp,
        }),
      }));

      const { POST: verifyOtp } = await import("../../../src/app/api/auth/otp/verify/route");
      const verifyResponse = await verifyOtp(
        new Request("http://localhost:3000/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: "15550009999", code: "123456" }),
        }),
      );

      expect(verifyResponse.status).toBe(200);

      const verifyJson = await verifyResponse.json();
      expect(verifyJson.user.phoneNumber).toBe("+15550009999");

      const { listSessions } = await import("../../../src/lib/db/store/session.store");
      expect(await listSessions()).toHaveLength(1);
    }, "auth-routes");
  });

  it("returns current auth data and dashboard groups for a valid session", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture({
        phoneNumber: "+15551112222",
        firstName: "Ada",
      });
      const friend = await createUserFixture({
        phoneNumber: "+15553334444",
        firstName: "Blair",
      });
      const { createFriendship } = await import("../../../src/lib/db/store/friendship.store");
      await createFriendship({
        user1Id: user.id,
        user2Id: friend.id,
        inviterId: user.id,
      });

      const { rawToken } = await createSessionFixture(user.id, "auth-me-token");
      const cookieHeader = `app_session=${rawToken}`;

      const { GET: authMe } = await import("../../../src/app/api/auth/me/route");
      const meResponse = await authMe(
        new Request("http://localhost:3000/api/auth/me", {
          headers: { cookie: cookieHeader },
        }) as any,
      );
      expect(meResponse.status).toBe(200);
      const meJson = await meResponse.json();
      expect(meJson.id).toBe(user.id);
      expect(meJson.network).toHaveLength(1);

      const { GET: dashboardGroups } = await import("../../../src/app/api/dashboard-groups/route");
      const groupsResponse = await dashboardGroups(
        new Request("http://localhost:3000/api/dashboard-groups", {
          headers: { cookie: cookieHeader },
        }),
      );

      expect(groupsResponse.status).toBe(200);
      await expect(groupsResponse.json()).resolves.toHaveLength(1);
    }, "auth-me-route");
  });

  it("clears the cookie and removes the session on logout", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture();
      const { rawToken } = await createSessionFixture(user.id, "logout-token");

      const { POST: logout } = await import("../../../src/app/api/auth/logout/route");
      const response = await logout(
        new Request("http://localhost:3000/api/auth/logout", {
          method: "POST",
          headers: { cookie: `app_session=${rawToken}` },
        }),
      );

      expect(response.status).toBe(204);
      expect(response.headers.get("set-cookie")).toContain("Max-Age=0");

      const { listSessions } = await import("../../../src/lib/db/store/session.store");
      expect(await listSessions()).toHaveLength(0);
    }, "logout-route");
  });
});
