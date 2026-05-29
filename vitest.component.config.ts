import { defineConfig } from "vitest/config";
import { coverageConfig, resolveConfig } from "./vitest.shared";

export default defineConfig({
  resolve: resolveConfig,
  test: {
    name: "component",
    globals: true,
    environment: "jsdom",
    setupFiles: [
      "./vitest.setup.shared.ts",
      "./vitest.setup.component.ts",
    ],
    include: ["src/**/*.test.tsx"],
    coverage: coverageConfig,
  },
});
