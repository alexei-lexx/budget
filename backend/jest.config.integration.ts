import type { Config } from "jest";
import baseConfig from "./jest.config.ts";

const config: Config = {
  ...baseConfig,
  testMatch: ["**/*.int.test.ts"],
  testPathIgnorePatterns: ["/node_modules/"],
  setupFilesAfterEnv: [
    "<rootDir>/src/utils/test-utils/integration-matchers.ts",
  ],
  testTimeout: 100000,
  maxWorkers: 1,
};

export default config;
