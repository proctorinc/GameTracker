import { drizzle } from "drizzle-orm/libsql";
import { createClient, Client } from "@libsql/client/node";
import * as schema from "./schema";
import { getEnv } from "../env-config";
import { describeDatabaseTarget, logInfo } from "../server-log";

const env = getEnv();
const isRemoteLibsql = !env.DATABASE_URL.startsWith("file:");

const sqlite = createClient({
  url: env.DATABASE_URL,
  ...(isRemoteLibsql && "TURSO_AUTH_TOKEN" in env && env.TURSO_AUTH_TOKEN
    ? { authToken: env.TURSO_AUTH_TOKEN }
    : {}),
});

logInfo("db.client.initialized", {
  appEnv: env.APP_ENV,
  databaseTarget: describeDatabaseTarget(env.DATABASE_URL),
  usesRemoteAuthToken:
    isRemoteLibsql && "TURSO_AUTH_TOKEN" in env && Boolean(env.TURSO_AUTH_TOKEN),
});

export const db = drizzle(sqlite, { schema });
export const sql = sqlite as Client;

export * from "./schema";
