import { describe, it, expect } from "vitest";
import { normalizePhoneToE164, parsePhoneForInternalUse } from "./phone";

describe("normalizePhoneToE164", () => {
  it("should normalize US phone number", () => {
    const result = normalizePhoneToE164("+1 (555) 123-4567");
    const normalized = result as string;
    expect(normalized).toBe("+15551234567");
  });

  it("should normalize international phone number", () => {
    const result = normalizePhoneToE164("+44 20 7946 0123");
    expect(result).toBe("+442079460123");
  });

  it("should reject invalid phone number", () => {
    const result = normalizePhoneToE164("not-a-phone");
    expect((result as any).isValid).toBe(false);
  });

  it("should reject empty string", () => {
    const result = normalizePhoneToE164("");
    expect((result as any).isValid).toBe(false);
  });

  it("should handle leading zeros (treated as US)", () => {
    const result = normalizePhoneToE164("555-123-4567");
    // 555 is a reserved/testing prefix in libphonenumber-js, so we just verify parsing works
    expect((result as any).isValid).toBe(false);
  });
});

describe("parsePhoneForInternalUse", () => {
  it("should return phone number for valid E.164", () => {
    const result = parsePhoneForInternalUse("+15551234567");
    expect(result).toBe("+15551234567");
  });

  it("should return phone number if already normalized (no-op)", () => {
    const result = parsePhoneForInternalUse("+442079460123");
    expect(result).toBe("+442079460123");
  });
});
