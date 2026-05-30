import type { Config } from "drizzle-kit";
import { validateEnv } from "./src/lib/env-config";

const env = validateEnv(true);
const isRemoteLibsql =
  env.DATABASE_URL.startsWith("libsql://") ||
  env.DATABASE_URL.startsWith("https://");

if (isRemoteLibsql && (!("TURSO_AUTH_TOKEN" in env) || !env.TURSO_AUTH_TOKEN)) {
  throw new Error(
    "TURSO_AUTH_TOKEN is required when DATABASE_URL points to a remote Turso/libSQL database.",
  );
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: isRemoteLibsql ? "turso" : "sqlite",
  dbCredentials: isRemoteLibsql
    ? {
        url: env.DATABASE_URL,
        authToken: env.TURSO_AUTH_TOKEN,
      }
    : {
        url: env.DATABASE_URL,
      },
} satisfies Config;
