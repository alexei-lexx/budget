import type { Config } from "jest";
import baseConfig from "./jest.config.ts";

const config: Config = {
  ...baseConfig,
  roots: ["<rootDir>/src/repositories"],
  testPathIgnorePatterns: ["/node_modules/", "\\.int\\.test\\.ts$"],
  maxWorkers: 1,
};

export default config;
