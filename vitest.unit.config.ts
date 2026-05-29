import { defineConfig } from "vitest/config";
import { coverageConfig, resolveConfig } from "./vitest.shared";

export default defineConfig({
  resolve: resolveConfig,
  test: {
    name: "unit",
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.shared.ts"],
    include: [
      "src/lib/**/*.test.ts",
      "src/app/actions/pages/**/*.test.ts",
    ],
    coverage: coverageConfig,
  },
});
