import { beforeAll, vi } from "vitest";
import { validateEnv } from "./src/lib/env-config";

// Setup mock for crypto
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    randomBytes: vi.fn((len: number) => Buffer.from(len).toString("base64url")),
    createHash: vi.fn(() => ({
      update: vi.fn(),
      digest: vi.fn().mockImplementation((enc?: string) =>
        enc === "hex" ? "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" : "",
      ),
    })),
    createHmac: vi.fn(() => ({
      update: vi.fn(),
      digest: vi.fn().mockImplementation((enc?: string) =>
        enc === "hex" ? "mocked-hmac-hash" : "",
      ),
    })),
  };
});

// Mock twilio service for tests
vi.mock("./src/lib/twilio/service", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    resolveVerifyProvider: vi.fn(() => ({
      sendOtp: vi.fn(async () => {}),
      checkOtp: vi.fn(async (_phoneE164: string, code: string) => {
        // Mock OTP checks based on environment and mock code
        const mockCode = process.env.AUTH_MOCK_OTP ?? "123456";
        console.log(`OTP verify for ${_phoneE164} with code "${code}" - approved: ${code === mockCode}`);
        return code === mockCode;
      }),
    })) as any,
  };
});

// Mock user-store to return a mock user when database isn't available yet
vi.mock("./src/lib/auth/user-store", async (realImport) => {
  const actual = await realImport();
  return {
    ...actual,
    ensureUserVerifiedAfterOtp: vi.fn(async (phoneE164, profile?) => ({
      id: "test-user-id",
      phone_e164: phoneE164,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      group_id: "test-group-id",
      phone_verified_at: Date.now(), // Use timestamp to match expected type
      created_at: Date.now(),
      updated_at: Date.now(),
    })),
    findUserByPhone: vi.fn(async (_phoneE164) => {
      // Return null for tests so new user is always created
      return null;
    }),
  };
});

// Mock session-store to create sessions in-memory
vi.mock("./src/lib/auth/session-store", async (importOriginal) => {
  const actual = await importOriginal();
  const createdSessions: any[] = [];
  return {
    ...actual,
    createSession: vi.fn(async (_userId, _tokenHash, expiresAtMs) => {
      const mockSession = {
        id: `test-session-${Date.now()}`,
        user_id: "test-user-id",
        token_hash: "mocked-hash",
        expires_at: expiresAtMs,
        created_at: new Date().toISOString(),
        user: {
          id: "test-user-id",
          phone_e164: "+15551234567",
          first_name: null,
          last_name: null,
          group_id: "test-group-id",
          phone_verified_at: new Date().toISOString(),
        },
      };
      createdSessions.push(mockSession);
      return mockSession;
    }),
    getSessionByToken: vi.fn(async (_sessionToken) => {
      // Return first session as mocked
      return createdSessions[0] ?? null;
    }),
    deleteSession: vi.fn(async () => {}),
  };
});

// Mock otpRateLimits table for tests to prevent import errors
vi.mock("./src/lib/db", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    otpRateLimits: undefined as any,
  };
});

// Mock tokens to use test secret and deterministic hashes
vi.mock("./src/lib/auth/tokens", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createSessionTokenWithSecret: vi.fn(() => ({
      raw: "test-token-" + Date.now(),
      hashed: "mocked-session-hash",
    })),
    hashTokenWithSecret: vi.fn((token) => `hashed-${token}`),
  };
});

process.env.APP_ENV = "test";
