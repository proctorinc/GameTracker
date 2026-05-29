import { defineConfig } from "vitest/config";
import { coverageConfig, resolveConfig } from "./vitest.shared";

export default defineConfig({
  resolve: resolveConfig,
  test: {
    name: "integration",
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.shared.ts"],
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30000,
    coverage: coverageConfig,
  },
});
