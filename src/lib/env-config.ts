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
  NEXT_PUBLIC_APP_ENV: "development",
  DEV_SEED_MIN_USERS: "100",
  CLERK_SIGN_IN_URL: "/login",
  CLERK_SIGN_UP_URL: "/register",
};

const testDefaults = {
  APP_ENV: "test" as const,
  DATABASE_URL: "file:./data/test.sqlite",
  NEXT_PUBLIC_APP_ENV: "test",
  CLERK_SIGN_IN_URL: "/login",
  CLERK_SIGN_UP_URL: "/register",
};

const optionalClerk = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  CLERK_SIGN_IN_URL: z.string().optional(),
  CLERK_SIGN_UP_URL: z.string().optional(),
});

const optionalTitleImageServices = z.object({
  OPENAI_API_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
});

function isRemoteLibsqlUrl(databaseUrl: string): boolean {
  return (
    databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("https://")
  );
}

const devSchema = z
  .object({
    APP_ENV: z.literal("development"),
    DATABASE_URL: z.string().min(1),
    NEXT_PUBLIC_APP_ENV: z.literal("development"),
    DEV_SEED_MIN_USERS: z.coerce.number().int().positive().optional(),
    DEV_SEED_FORCE: z.enum(["0", "1"]).optional(),
    DEV_SEED_RESET: z.enum(["0", "1"]).optional(),
    TURSO_AUTH_TOKEN: z.string().optional(),
  })
  .merge(optionalClerk)
  .merge(optionalTitleImageServices)
  .superRefine((env, ctx) => {
    if (isRemoteLibsqlUrl(env.DATABASE_URL) && !env.TURSO_AUTH_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TURSO_AUTH_TOKEN"],
        message:
          "is required when DATABASE_URL points to a remote Turso/libSQL database",
      });
    }
  });

const testSchema = z
  .object({
    APP_ENV: z.literal("test"),
    DATABASE_URL: z.string().min(1),
    NEXT_PUBLIC_APP_ENV: z.literal("test"),
    TURSO_AUTH_TOKEN: z.string().optional(),
  })
  .merge(optionalClerk)
  .merge(optionalTitleImageServices)
  .superRefine((env, ctx) => {
    if (isRemoteLibsqlUrl(env.DATABASE_URL) && !env.TURSO_AUTH_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TURSO_AUTH_TOKEN"],
        message:
          "is required when DATABASE_URL points to a remote Turso/libSQL database",
      });
    }
  });

const prodSchema = z.object({
  APP_ENV: z.literal("production"),
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_ENV: z.literal("production").optional(),
  CLERK_SIGN_IN_URL: z.string().optional(),
  CLERK_SIGN_UP_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_PUBLIC_BASE_URL: z.string().url(),
});

export type DevEnv = z.infer<typeof devSchema>;
export type TestEnv = z.infer<typeof testSchema>;
export type ProdEnv = z.infer<typeof prodSchema>;
export type AppEnvConfig = DevEnv | TestEnv | ProdEnv;

function readRawEnv(): Record<string, string | undefined> {
  return { ...process.env };
}

function applyDevDefaults(raw: Record<string, string | undefined>) {
  return {
    ...devDefaults,
    ...raw,
    APP_ENV: "development",
    NEXT_PUBLIC_APP_ENV:
      raw.NEXT_PUBLIC_APP_ENV ?? devDefaults.NEXT_PUBLIC_APP_ENV,
    DATABASE_URL: raw.DATABASE_URL ?? devDefaults.DATABASE_URL,
    DEV_SEED_MIN_USERS: raw.DEV_SEED_MIN_USERS ?? devDefaults.DEV_SEED_MIN_USERS,
    CLERK_SIGN_IN_URL: raw.CLERK_SIGN_IN_URL ?? devDefaults.CLERK_SIGN_IN_URL,
    CLERK_SIGN_UP_URL: raw.CLERK_SIGN_UP_URL ?? devDefaults.CLERK_SIGN_UP_URL,
  };
}

function applyTestDefaults(raw: Record<string, string | undefined>) {
  return {
    ...testDefaults,
    ...raw,
    APP_ENV: "test",
    NEXT_PUBLIC_APP_ENV:
      raw.NEXT_PUBLIC_APP_ENV ?? testDefaults.NEXT_PUBLIC_APP_ENV,
    DATABASE_URL: raw.DATABASE_URL ?? testDefaults.DATABASE_URL,
    CLERK_SIGN_IN_URL: raw.CLERK_SIGN_IN_URL ?? testDefaults.CLERK_SIGN_IN_URL,
    CLERK_SIGN_UP_URL: raw.CLERK_SIGN_UP_URL ?? testDefaults.CLERK_SIGN_UP_URL,
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

function syncOptionalEnv(name: string, value?: string) {
  if (value) {
    process.env[name] = value;
  } else {
    delete process.env[name];
  }
}

function syncToProcessEnv(config: AppEnvConfig): void {
  process.env.APP_ENV = config.APP_ENV;
  process.env.DATABASE_URL = config.DATABASE_URL;

  if ("NEXT_PUBLIC_APP_ENV" in config && config.NEXT_PUBLIC_APP_ENV) {
    process.env.NEXT_PUBLIC_APP_ENV = config.NEXT_PUBLIC_APP_ENV;
  }

  if (
    config.APP_ENV === "development" &&
    "DEV_SEED_MIN_USERS" in config &&
    config.DEV_SEED_MIN_USERS
  ) {
    process.env.DEV_SEED_MIN_USERS = String(config.DEV_SEED_MIN_USERS);
  }

  if ("TURSO_AUTH_TOKEN" in config) {
    syncOptionalEnv("TURSO_AUTH_TOKEN", config.TURSO_AUTH_TOKEN);
  }

  if ("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" in config) {
    syncOptionalEnv(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      config.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    );
  }

  if ("CLERK_SECRET_KEY" in config) {
    syncOptionalEnv("CLERK_SECRET_KEY", config.CLERK_SECRET_KEY);
  }

  if ("CLERK_WEBHOOK_SIGNING_SECRET" in config) {
    syncOptionalEnv(
      "CLERK_WEBHOOK_SIGNING_SECRET",
      config.CLERK_WEBHOOK_SIGNING_SECRET,
    );
  }

  if ("CLERK_SIGN_IN_URL" in config) {
    syncOptionalEnv("CLERK_SIGN_IN_URL", config.CLERK_SIGN_IN_URL);
  }

  if ("CLERK_SIGN_UP_URL" in config) {
    syncOptionalEnv("CLERK_SIGN_UP_URL", config.CLERK_SIGN_UP_URL);
  }

  if ("OPENAI_API_KEY" in config) {
    syncOptionalEnv("OPENAI_API_KEY", config.OPENAI_API_KEY);
  }

  if ("S3_BUCKET" in config) {
    syncOptionalEnv("S3_BUCKET", config.S3_BUCKET);
  }

  if ("S3_REGION" in config) {
    syncOptionalEnv("S3_REGION", config.S3_REGION);
  }

  if ("S3_ACCESS_KEY_ID" in config) {
    syncOptionalEnv("S3_ACCESS_KEY_ID", config.S3_ACCESS_KEY_ID);
  }

  if ("S3_SECRET_ACCESS_KEY" in config) {
    syncOptionalEnv("S3_SECRET_ACCESS_KEY", config.S3_SECRET_ACCESS_KEY);
  }

  if ("S3_PUBLIC_BASE_URL" in config) {
    syncOptionalEnv("S3_PUBLIC_BASE_URL", config.S3_PUBLIC_BASE_URL);
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
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
          raw.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        CLERK_SECRET_KEY: raw.CLERK_SECRET_KEY,
        CLERK_WEBHOOK_SIGNING_SECRET: raw.CLERK_WEBHOOK_SIGNING_SECRET,
        NEXT_PUBLIC_APP_ENV: raw.NEXT_PUBLIC_APP_ENV ?? "production",
        CLERK_SIGN_IN_URL: raw.CLERK_SIGN_IN_URL,
        CLERK_SIGN_UP_URL: raw.CLERK_SIGN_UP_URL,
        TURSO_AUTH_TOKEN: raw.TURSO_AUTH_TOKEN,
        OPENAI_API_KEY: raw.OPENAI_API_KEY,
        S3_BUCKET: raw.S3_BUCKET,
        S3_REGION: raw.S3_REGION,
        S3_ACCESS_KEY_ID: raw.S3_ACCESS_KEY_ID,
        S3_SECRET_ACCESS_KEY: raw.S3_SECRET_ACCESS_KEY,
        S3_PUBLIC_BASE_URL: raw.S3_PUBLIC_BASE_URL,
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

/**
 * Route-level validation for Clerk webhooks.
 * Keep this separate from global env validation so production builds can
 * complete even when the webhook endpoint is not configured in a given deploy.
 */
export function getClerkWebhookSigningSecret(): string {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim();

  if (!secret) {
    throw new Error(
      'Missing environment variable "CLERK_WEBHOOK_SIGNING_SECRET" required for Clerk webhooks.',
    );
  }

  return secret;
}
