import { afterEach, describe, expect, it } from "vitest";
import { validateEnv } from "./env-config";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("validateEnv", () => {
  it("applies dev defaults without any env vars set", () => {
    process.env = { NODE_ENV: "development" };
    const env = validateEnv(true);
    expect(env.APP_ENV).toBe("development");
    expect(env.DATABASE_URL).toBe("file:./data/dev.sqlite");
    expect(env.SESSION_SECRET).toContain("dev-insecure");
  });

  it("does not infer production from NODE_ENV alone", () => {
    process.env = { NODE_ENV: "production" };
    const env = validateEnv(true);
    expect(env.APP_ENV).toBe("development");
  });

  it("lists missing production variables", () => {
    process.env = { APP_ENV: "production", NODE_ENV: "production" };
    expect(() => validateEnv(true)).toThrow(
      /Invalid environment configuration for "production"/,
    );
    expect(() => validateEnv(true)).toThrow(/DATABASE_URL/);
    expect(() => validateEnv(true)).toThrow(/SESSION_SECRET/);
    expect(() => validateEnv(true)).toThrow(/TWILIO_ACCOUNT_SID/);
  });

  it("accepts valid production config", () => {
    process.env = {
      APP_ENV: "production",
      NODE_ENV: "production",
      DATABASE_URL: "file:./data/prod.sqlite",
      SESSION_SECRET: "a".repeat(32),
      TWILIO_ACCOUNT_SID: "ACtest",
      TWILIO_AUTH_TOKEN: "token",
      TWILIO_VERIFY_SERVICE_SID: "VATEST",
      TURSO_AUTH_TOKEN: "turso-token",
    };
    const env = validateEnv(true);
    expect(env.APP_ENV).toBe("production");
    expect(env.TWILIO_ACCOUNT_SID).toBe("ACtest");
  });

  it("applies test defaults", () => {
    process.env = { APP_ENV: "test", NODE_ENV: "test" };
    const env = validateEnv(true);
    expect(env.APP_ENV).toBe("test");
    expect(env.DATABASE_URL).toBe("file:./data/test.sqlite");
  });
});
