import { defineConfig } from "vitest/config";

import baseConfig from "./vitest.config";

// Stryker runs only the "unit" project
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    projects: baseConfig.test?.projects?.filter(
      (project) =>
        typeof project === "object" &&
        "test" in project &&
        project.test?.name === "unit",
    ),
  },
});
