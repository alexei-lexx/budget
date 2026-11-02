import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.eval.test.ts"],
    maxWorkers: 1,
    reporters: ["langsmith/vitest/reporter"],
    setupFiles: ["src/utils/test-utils/langsmith-flush.ts"],
    testTimeout: 100000,
  },
});
