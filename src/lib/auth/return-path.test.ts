import { describe, expect, it } from "vitest";
import { DEFAULT_RETURN_PATH, sanitizeReturnPath } from "./return-path";

describe("sanitizeReturnPath", () => {
  it("accepts internal paths and query strings", () => {
    expect(sanitizeReturnPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeReturnPath("/settings?tab=profile")).toBe("/settings?tab=profile");
  });

  it("rejects unsafe or invalid targets", () => {
    expect(sanitizeReturnPath("https://evil.com")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnPath("//evil.com")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnPath("javascript:alert(1)")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnPath("login")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnPath("/login")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnPath("/\\evil")).toBe(DEFAULT_RETURN_PATH);
  });

  it("falls back to the default path when missing", () => {
    expect(sanitizeReturnPath(null)).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeReturnPath("")).toBe(DEFAULT_RETURN_PATH);
  });
});
