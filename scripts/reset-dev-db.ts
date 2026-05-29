import fs from "node:fs";
import path from "node:path";
import { validateEnv } from "../src/lib/env-config";

async function main() {
  const env = validateEnv(true);

  if (env.APP_ENV !== "development") {
    throw new Error("db:reset can only be used in development");
  }

  if (!env.DATABASE_URL.startsWith("file:")) {
    throw new Error("db:reset only supports local file databases");
  }

  const filePath = path.resolve(
    process.cwd(),
    env.DATABASE_URL.slice("file:".length),
  );

  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath);
    console.log(`[db:reset] Removed ${filePath}`);
  } else {
    console.log(`[db:reset] No database file found at ${filePath}`);
  }

  console.log("[db:reset] Next run `npm run dev` to regenerate, migrate, and seed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
