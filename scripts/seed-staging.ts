import { validateEnv } from "../src/lib/env-config";

async function main() {
  const env = validateEnv(true);
  const confirmation = process.env.STAGING_SEED_CONFIRM;

  if (env.APP_ENV !== "production") {
    throw new Error("db:seed:staging requires APP_ENV=production");
  }

  if (confirmation !== "skybo-staging") {
    throw new Error(
      "db:seed:staging is destructive. Re-run with STAGING_SEED_CONFIRM=skybo-staging after verifying the staging database URL.",
    );
  }

  if (env.DATABASE_URL.startsWith("file:")) {
    throw new Error("db:seed:staging requires a remote Turso/libSQL database URL");
  }

  const { runDevSeed } = await import("../src/lib/dev/seed");
  await runDevSeed();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
