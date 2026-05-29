import { drizzle } from "drizzle-orm/libsql";
import { createClient, Client } from "@libsql/client/node";
import * as schema from "./schema";
import { getEnv } from "../env-config";

const sqlite = createClient({
  url: getEnv().DATABASE_URL,
});

export const db = drizzle(sqlite, { schema });
export const sql = sqlite as Client;

export * from "./schema";
