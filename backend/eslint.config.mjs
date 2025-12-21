// @ts-check
//
// See https://typescript-eslint.io/getting-started/

import eslint from "@eslint/js";
import checkFilePlugin from "eslint-plugin-check-file";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    ignores: ["**/dist/", "**/__generated__/"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
    ],
    plugins: {
      "check-file": checkFilePlugin,
    },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        {
          "**/*.{ts,tsx}": "KEBAB_CASE",
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
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
  {
    files: ["**/migrations/**/*.{ts,tsx}"],
    rules: {
      // Migration files use timestamp prefix format (YYYYMMDDHHMMSS-description.ts)
      // which doesn't match kebab-case pattern
      "check-file/filename-naming-convention": "off",
    },
  },
);
