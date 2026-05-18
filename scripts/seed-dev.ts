import { validateEnv } from "../src/lib/env-config";

async function main() {
  validateEnv(true);

  const { runDevSeed } = await import("../src/lib/dev/seed");
  const result = await runDevSeed();
  console.log(result);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
