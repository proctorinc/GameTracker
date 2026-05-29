import { drizzle } from "drizzle-orm/libsql";
import { createClient, Client } from "@libsql/client/node";
import * as schema from "./schema";
import { getEnv } from "../env-config";
import { describeDatabaseTarget, logInfo } from "../server-log";

const env = getEnv();

const sqlite = createClient({
  url: env.DATABASE_URL,
  ...(env.APP_ENV === "production"
    ? { authToken: env.TURSO_AUTH_TOKEN }
    : {}),
});

logInfo("db.client.initialized", {
  appEnv: env.APP_ENV,
  databaseTarget: describeDatabaseTarget(env.DATABASE_URL),
  usesRemoteAuthToken: env.APP_ENV === "production",
});

export const db = drizzle(sqlite, { schema });
export const sql = sqlite as Client;

export * from "./schema";
