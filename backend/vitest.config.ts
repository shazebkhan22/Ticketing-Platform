import { defineConfig } from "vitest/config";

// Unit tests only — no database required, so these run fast and everywhere
// (including as a pre-commit check). DB-backed tests live under
// vitest.e2e.config.ts instead.
export default defineConfig({
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/*.e2e.test.ts"],
  },
});
