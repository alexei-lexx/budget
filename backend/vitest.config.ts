import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: [
            "**/node_modules/**",
            "**/*.db.test.ts",
            "**/*.eval.test.ts",
          ],
          testTimeout: 10000,
          setupFiles: ["src/utils/test-utils/result-matchers.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["src/**/*.db.test.ts"],
          exclude: ["**/node_modules/**"],
          testTimeout: 10000,
          maxWorkers: 1,
          setupFiles: ["src/utils/test-utils/result-matchers.ts"],
        },
      },
    ],
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/__generated__/**"],
      reportsDirectory: "coverage",
    },
  },
});
