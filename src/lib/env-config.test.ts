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
    expect(env.CLERK_SIGN_IN_URL).toBe("/login");
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
    expect(() => validateEnv(true)).toThrow(
      /NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/,
    );
    expect(() => validateEnv(true)).toThrow(/CLERK_SECRET_KEY/);
    expect(() => validateEnv(true)).toThrow(/OPENAI_API_KEY/);
    expect(() => validateEnv(true)).toThrow(/S3_BUCKET/);
  });

  it("accepts valid production config", () => {
    process.env = {
      APP_ENV: "production",
      NODE_ENV: "production",
      DATABASE_URL: "file:./data/prod.sqlite",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
      CLERK_SECRET_KEY: "sk_test_123",
      CLERK_WEBHOOK_SIGNING_SECRET: "whsec_test_123",
      TURSO_AUTH_TOKEN: "turso-token",
      OPENAI_API_KEY: "openai-key",
      S3_BUCKET: "score-loser",
      S3_REGION: "us-east-1",
      S3_ACCESS_KEY_ID: "access-key",
      S3_SECRET_ACCESS_KEY: "secret-key",
      S3_PUBLIC_BASE_URL: "https://score-loser.s3.us-east-1.amazonaws.com",
    };
    const env = validateEnv(true);
    expect(env.APP_ENV).toBe("production");
    expect(env.CLERK_SECRET_KEY).toBe("sk_test_123");
    expect(env.OPENAI_API_KEY).toBe("openai-key");
  });

  it("applies test defaults", () => {
    process.env = { APP_ENV: "test", NODE_ENV: "test" };
    const env = validateEnv(true);
    expect(env.APP_ENV).toBe("test");
    expect(env.DATABASE_URL).toBe("file:./data/test.sqlite");
  });

  it("accepts test config with remote Turso credentials", () => {
    process.env = {
      APP_ENV: "test",
      NODE_ENV: "test",
      DATABASE_URL: "libsql://skybo-test.turso.io",
      NEXT_PUBLIC_APP_ENV: "test",
      TURSO_AUTH_TOKEN: "turso-test-token",
    };
    const env = validateEnv(true);
    expect(env.APP_ENV).toBe("test");
    expect(env.DATABASE_URL).toBe("libsql://skybo-test.turso.io");
    expect("TURSO_AUTH_TOKEN" in env && env.TURSO_AUTH_TOKEN).toBe(
      "turso-test-token",
    );
  });

  it("rejects remote test config without a Turso auth token", () => {
    process.env = {
      APP_ENV: "test",
      NODE_ENV: "test",
      DATABASE_URL: "libsql://skybo-test.turso.io",
      NEXT_PUBLIC_APP_ENV: "test",
    };
    expect(() => validateEnv(true)).toThrow(/TURSO_AUTH_TOKEN/);
  });
});
