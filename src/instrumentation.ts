export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv, resolveAppEnv } = await import("@/lib/env-config");
    const { describeDatabaseTarget, logInfo } = await import("@/lib/server-log");
    const env = validateEnv(true);
    if (resolveAppEnv() === "production") {
      logInfo("env.production.validated", {
        databaseTarget: describeDatabaseTarget(env.DATABASE_URL),
        nextPublicAppEnv: "NEXT_PUBLIC_APP_ENV" in env ? env.NEXT_PUBLIC_APP_ENV ?? null : null,
      });
    }
  }
}
