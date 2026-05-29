import { afterEach, vi } from "vitest";

process.env.APP_ENV = "test";
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_APP_ENV ??= "test";
process.env.DATABASE_URL ??= "file:./data/test.sqlite";
process.env.SESSION_SECRET ??=
  "test-session-secret-for-vitest-only-1234567890";
process.env.AUTH_MOCK_OTP ??= "123456";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
