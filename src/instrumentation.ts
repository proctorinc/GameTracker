export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv, resolveAppEnv } = await import("@/lib/env-config");
    const env = validateEnv(true);
    if (resolveAppEnv() === "production") {
      console.info(`[env] Validated production configuration (database: ${env.DATABASE_URL})`);
    }
  }
}
