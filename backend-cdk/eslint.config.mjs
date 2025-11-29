// @ts-check
//
// See https://typescript-eslint.io/getting-started/

import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    ignores: [
      "**/cdk.out/**",
      "**/bin/*.js",
      "**/lib/**/*.js",
      "**/test/**/*.js",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
    ],
    rules: {
      "import/order": [
        "error",
        {
          alphabetize: {
            order: "asc",
            caseInsensitive: false,
          },
        },
      ],
      "sort-imports": [
        "error",
        {
          ignoreDeclarationSort: true, // Let import/order handle this
          ignoreMemberSort: false, // Sort members alphabetically
        },
      ],
    },
  },
);
