import path from "node:path";
import { fileURLToPath } from "node:url";

export const srcPath = fileURLToPath(new URL("./src", import.meta.url));

export const coverageConfig = {
  provider: "v8" as const,
  reporter: ["text", "json", "html"],
  reportOnFailure: true,
  thresholds: {
    lines: 70,
    statements: 70,
    functions: 70,
    branches: 60,
  },
  exclude: [
    "docs/**",
    "tests/e2e/**",
    "tests/helpers/**",
    "tests/fixtures/**",
    "playwright.config.ts",
  ],
};

export const resolveConfig = {
  alias: {
    "@": path.resolve(srcPath),
  },
};
