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
            "src/repositories/**",
            "**/*.int.test.ts",
          ],
          testTimeout: 10000,
        },
      },
      {
        extends: true,
        test: {
          name: "repositories",
          environment: "node",
          include: ["src/repositories/**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/*.int.test.ts"],
          testTimeout: 10000,
          maxWorkers: 1,
          minWorkers: 1,
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          exclude: ["**/node_modules/**"],
          testTimeout: 100000,
          maxWorkers: 1,
          minWorkers: 1,
          setupFiles: ["src/utils/test-utils/integration-matchers.ts"],
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
