import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.phoenix-eval.test.ts"],
    maxWorkers: 1,
    reporters: ["default", "@arizeai/phoenix-client/vitest/reporter"],
    testTimeout: 100000,
  },
});
