import { z } from "zod";

export type AppEnv = "development" | "production" | "test";

const appEnvSchema = z.enum(["development", "production", "test"]);

/**
 * Resolve APP_ENV before validation (used to pick the schema).
 * Production is never inferred from NODE_ENV alone — set APP_ENV=production explicitly.
 */
export function resolveAppEnv(): AppEnv {
  if (process.env.APP_ENV) {
    const parsed = appEnvSchema.safeParse(process.env.APP_ENV);
    return parsed.success ? parsed.data : "development";
  }
  if (process.env.NODE_ENV === "test") {
    return "test";
  }
  return "development";
}

const devDefaults = {
  APP_ENV: "development" as const,
  DATABASE_URL: "file:./data/dev.sqlite",
  SESSION_SECRET: "dev-insecure-session-secret-do-not-use-in-production",
  NEXT_PUBLIC_APP_ENV: "development",
  DEV_SEED_MIN_USERS: "100",
};

const testDefaults = {
  APP_ENV: "test" as const,
  DATABASE_URL: "file:./data/test.sqlite",
  SESSION_SECRET: "test-session-secret-for-tests-only",
  NEXT_PUBLIC_APP_ENV: "test",
};

const optionalTwilio = z.object({
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
});

const devSchema = z
  .object({
    APP_ENV: z.literal("development"),
    DATABASE_URL: z.string().min(1),
    SESSION_SECRET: z.string().min(1),
    NEXT_PUBLIC_APP_ENV: z.literal("development"),
    DEV_SEED_MIN_USERS: z.coerce.number().int().positive().optional(),
    DEV_SEED_FORCE: z.enum(["0", "1"]).optional(),
    DEV_SEED_RESET: z.enum(["0", "1"]).optional(),
    AUTH_MOCK_OTP: z.string().optional(),
  })
  .merge(optionalTwilio);

const testSchema = z
  .object({
    APP_ENV: z.literal("test"),
    DATABASE_URL: z.string().min(1),
    SESSION_SECRET: z.string().min(1),
    NEXT_PUBLIC_APP_ENV: z.literal("test"),
    AUTH_MOCK_OTP: z.string().optional(),
  })
  .merge(optionalTwilio);

const prodSchema = z.object({
  APP_ENV: z.literal("production"),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "must be at least 32 characters"),
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_VERIFY_SERVICE_SID: z.string().min(1),
  NEXT_PUBLIC_APP_ENV: z.literal("production").optional(),
});

export type DevEnv = z.infer<typeof devSchema>;
export type TestEnv = z.infer<typeof testSchema>;
export type ProdEnv = z.infer<typeof prodSchema>;
export type AppEnvConfig = DevEnv | TestEnv | ProdEnv;

function readRawEnv(): Record<string, string | undefined> {
  return { ...process.env };
}

function applyDevDefaults(raw: Record<string, string | undefined>): Record<string, string | undefined> {
  return {
    ...devDefaults,
    ...raw,
    APP_ENV: "development",
    NEXT_PUBLIC_APP_ENV: raw.NEXT_PUBLIC_APP_ENV ?? devDefaults.NEXT_PUBLIC_APP_ENV,
    DATABASE_URL: raw.DATABASE_URL ?? devDefaults.DATABASE_URL,
    SESSION_SECRET: raw.SESSION_SECRET ?? devDefaults.SESSION_SECRET,
    DEV_SEED_MIN_USERS: raw.DEV_SEED_MIN_USERS ?? devDefaults.DEV_SEED_MIN_USERS,
  };
}

function applyTestDefaults(raw: Record<string, string | undefined>): Record<string, string | undefined> {
  return {
    ...testDefaults,
    ...raw,
    APP_ENV: "test",
    NEXT_PUBLIC_APP_ENV: raw.NEXT_PUBLIC_APP_ENV ?? testDefaults.NEXT_PUBLIC_APP_ENV,
    DATABASE_URL: raw.DATABASE_URL ?? testDefaults.DATABASE_URL,
    SESSION_SECRET: raw.SESSION_SECRET ?? testDefaults.SESSION_SECRET,
  };
}

function formatZodEnvError(appEnv: AppEnv, error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const name = issue.path.length > 0 ? issue.path.join(".") : "environment";
    return `  - ${name}: ${issue.message}`;
  });
  return [
    `Invalid environment configuration for "${appEnv}".`,
    "Missing or invalid environment variables:",
    ...lines,
  ].join("\n");
}

function syncToProcessEnv(config: AppEnvConfig): void {
  process.env.APP_ENV = config.APP_ENV;
  process.env.DATABASE_URL = config.DATABASE_URL;
  process.env.SESSION_SECRET = config.SESSION_SECRET;

  if ("NEXT_PUBLIC_APP_ENV" in config && config.NEXT_PUBLIC_APP_ENV) {
    process.env.NEXT_PUBLIC_APP_ENV = config.NEXT_PUBLIC_APP_ENV;
  }

  if (config.APP_ENV === "development" && "DEV_SEED_MIN_USERS" in config && config.DEV_SEED_MIN_USERS) {
    process.env.DEV_SEED_MIN_USERS = String(config.DEV_SEED_MIN_USERS);
  }

  if (config.APP_ENV === "production") {
    const prod = config as ProdEnv;
    process.env.TWILIO_ACCOUNT_SID = prod.TWILIO_ACCOUNT_SID;
    process.env.TWILIO_AUTH_TOKEN = prod.TWILIO_AUTH_TOKEN;
    process.env.TWILIO_VERIFY_SERVICE_SID = prod.TWILIO_VERIFY_SERVICE_SID;
  }
}

let cached: AppEnvConfig | null = null;

/**
 * Validate environment variables for the current APP_ENV.
 * Development and test apply safe defaults; production requires all secrets.
 */
export function validateEnv(force = false): AppEnvConfig {
  if (cached && !force) {
    return cached;
  }

  const appEnv = resolveAppEnv();
  const raw = readRawEnv();

  let result:
    | ReturnType<typeof devSchema.safeParse>
    | ReturnType<typeof testSchema.safeParse>
    | ReturnType<typeof prodSchema.safeParse>;

  switch (appEnv) {
    case "development":
      result = devSchema.safeParse(applyDevDefaults(raw));
      break;
    case "test":
      result = testSchema.safeParse(applyTestDefaults(raw));
      break;
    case "production": {
      result = prodSchema.safeParse({
        ...raw,
        APP_ENV: "production",
        DATABASE_URL: raw.DATABASE_URL,
        SESSION_SECRET: raw.SESSION_SECRET,
        TWILIO_ACCOUNT_SID: raw.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: raw.TWILIO_AUTH_TOKEN,
        TWILIO_VERIFY_SERVICE_SID: raw.TWILIO_VERIFY_SERVICE_SID,
        NEXT_PUBLIC_APP_ENV: raw.NEXT_PUBLIC_APP_ENV ?? "production",
      });
      break;
    }
    default:
      throw new Error(`Unknown APP_ENV: ${appEnv satisfies never}`);
  }

  if (!result.success) {
    throw new Error(formatZodEnvError(appEnv, result.error));
  }

  cached = result.data;
  syncToProcessEnv(cached);
  return cached;
}

/** Validated environment (throws on first access if invalid). */
export function getEnv(): AppEnvConfig {
  return validateEnv();
}
