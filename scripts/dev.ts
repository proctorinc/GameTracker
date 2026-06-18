import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { validateEnv } from "../src/lib/env-config";

async function main() {
  const env = validateEnv(true);

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const isLocalDatabase = env.DATABASE_URL.startsWith("file:");
  const databasePath = isLocalDatabase
    ? path.resolve(process.cwd(), env.DATABASE_URL.slice("file:".length))
    : null;
  const databaseExistedAtStartup = databasePath ? fs.existsSync(databasePath) : false;
  const shouldResetSeed = env.APP_ENV === "development" && process.env.DEV_SEED_RESET === "1";
  const shouldForceSeed = env.APP_ENV === "development" && process.env.DEV_SEED_FORCE === "1";

  if (shouldResetSeed && databasePath && fs.existsSync(databasePath)) {
    fs.rmSync(databasePath);
    console.log(`[dev] Reset local database at ${databasePath}`);
  }

  console.log(`[dev] APP_ENV=${env.APP_ENV}`);
  console.log(`[dev] DATABASE_URL=${env.DATABASE_URL}`);

  console.log("[dev] Generating database…");
  execSync("npm run db:generate", { stdio: "inherit", env: process.env });

  console.log("[dev] Applying migrations…");
  execSync("npm run db:migrate", { stdio: "inherit", env: process.env });

  const shouldSeed =
    shouldForceSeed ||
    shouldResetSeed ||
    !databaseExistedAtStartup;

  if (shouldSeed) {
    const { runDevSeed } = await import("../src/lib/dev/seed");
    await runDevSeed();
  } else {
    console.log("[dev] Reusing existing local database. Set DEV_SEED_FORCE=1 to reseed.");
  }

  console.log("[dev] Starting Next.js…");
  const child = spawn("npx", ["next", "dev"], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  console.log("[dev] Seeding games…");
  execSync(
    "npm run db:titles:import -- ./data/bgg-browse-boardgames-numvoters-pages-1-10.json",
    { stdio: "inherit", env: process.env },
  );

  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
