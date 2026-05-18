import { describe, it, expect } from "vitest";

// Mock the route handler at setup time (allowed in tests)
const _requestRoute = await import("@/app/api/auth/otp/request/route");

describe("Auth API - Request OTP", () => {
  const { POST } = _requestRoute;

  it("should accept valid US phone number", async () => {
    const response = await POST(new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+15551234567" }),
    }));
    expect(response.status).toBe(200);
  });

  it("should accept valid international phone number", async () => {
    const response = await POST(new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+442079460123" }),
    }));
    expect(response.status).toBe(200);
  });

  it("should reject invalid phone format", async () => {
    const response = await POST(new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "invalid-phone" }),
    }));
    expect(response.status).toBe(400);
  });

  it("should reject missing phone parameter", async () => {
    const response = await POST(new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }));
    expect(response.status).toBe(400);
  });

  it("should reject empty phone string", async () => {
    const response = await POST(new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "" }),
    }));
    expect(response.status).toBe(400);
  });

  it("should reject phone with only special characters", async () => {
    const response = await POST(new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "!!!@@@" }),
    }));
    expect(response.status).toBe(400);
  });

  it("should accept number with leading zeros", async () => {
    const response = await POST(new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+105551234567" }),
    }));
    expect(response.status).toBe(200);
  });
});
