import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { getEnv } from "@/lib/env-config";

// Create a client-side database connection (for API routes and edge functions)
export const createDbClient = () => {
  const sqlite = createClient({
    url: getEnv().DATABASE_URL,
  });

  return drizzle(sqlite);
};
