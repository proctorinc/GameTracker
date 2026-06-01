import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { validateEnv } from "../src/lib/env-config";

async function main() {
  const env = validateEnv(true);

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  console.log(`[dev] APP_ENV=${env.APP_ENV}`);
  console.log(`[dev] DATABASE_URL=${env.DATABASE_URL}`);

  console.log("[dev] Generating database…");
  execSync("npm run db:generate", { stdio: "inherit", env: process.env });

  console.log("[dev] Applying migrations…");
  execSync("npm run db:migrate", { stdio: "inherit", env: process.env });

  const { runDevSeed } = await import("../src/lib/dev/seed");
  await runDevSeed();

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
