import type { Config } from "drizzle-kit";
import { validateEnv } from "./src/lib/env-config";

const env = validateEnv(true);

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
} satisfies Config;
