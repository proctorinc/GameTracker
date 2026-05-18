import { describe, it, expect, vi } from "vitest";

// Import after global mocks from vitest.setup.ts have been applied
const { POST: requestPOST } = await import("@/app/api/auth/otp/request/route");
const { POST: verifyPOST } = await import("@/app/api/auth/otp/verify/route");
const { POST: logoutPOST } = await import("@/app/api/auth/logout/route");

describe("Auth API - Request OTP", () => {
  it("should accept valid phone number", async () => {
    const response = await requestPOST(new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+15551234567" }),
    }));
    expect(response.status).toBe(200);
  });

  it("should reject invalid phone number", async () => {
    const response = await requestPOST(new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "invalid-phone" }),
    }));
    expect(response.status).toBe(400);
  });

  it("should accept valid international phone", async () => {
    const response = await requestPOST(new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+442079460123" }),
    }));
    expect(response.status).toBe(200);
  });

  it("should reject missing phone", async () => {
    const response = await requestPOST(new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }));
    expect(response.status).toBe(400);
  });

  it("should reject empty phone string", async () => {
    const response = await requestPOST(new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "" }),
    }));
    expect(response.status).toBe(400);
  });
});

describe("Auth API - Verify OTP", () => {
  it("should reject verify with wrong code (mock mode)", async () => {
    // In mock mode, only AUTH_MOCK_OTP=123456 will pass
    const response = await verifyPOST(new Request("http://localhost:3000/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+15551234567", code: "999999" }),
    }));

    expect(response.status).toBe(401);
  });

  it("should create session on correct verify (mocked)", async () => {
    // Use mock provider which accepts AUTH_MOCK_OTP in dev/test mode
    const response = await verifyPOST(new Request("http://localhost:3000/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+15551234567", code: "123456" }),
    }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.user).toBeDefined();
  });
});

describe("Auth API - Logout", () => {
  it("should clear cookie on logout", async () => {
    const headers = new Headers();
    headers.append("cookie", "skyjo_session=test-token");

    const response = await logoutPOST(new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers,
    }));

    expect(response.status).toBe(204);
  });
});
