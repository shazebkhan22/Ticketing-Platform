import { defineConfig } from "vitest/config";

// E2E/integration tests against a real (disposable) Postgres database —
// requires TEST_DATABASE_URL (or the localhost default in src/test/setup.ts)
// to point at a database that is safe to wipe.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.e2e.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 15000,
    fileParallelism: false,
  },
});
