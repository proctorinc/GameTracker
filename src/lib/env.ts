import { getEnv, resolveAppEnv, validateEnv, type AppEnv, type AppEnvConfig } from "./env-config";

export type { AppEnv, AppEnvConfig };
export { getEnv, resolveAppEnv, validateEnv };

export function getAppEnv(): AppEnv {
  return resolveAppEnv();
}

export function isDev(): boolean {
  return resolveAppEnv() === "development";
}

export function isProd(): boolean {
  return resolveAppEnv() === "production";
}

export function isTest(): boolean {
  return resolveAppEnv() === "test";
}
