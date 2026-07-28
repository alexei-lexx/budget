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
    // Override the default node resolver from flatConfigs.typescript with
    // eslint-import-resolver-typescript, which supports the package.json
    // "exports" field (needed by packages like aws-lambda).
    settings: {
      "import/resolver": {
        typescript: true,
      },
    },
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
      // @modelcontextprotocol/sdk resolves subpaths (e.g. "./server/mcp.js")
      // via a wildcard "exports" entry whose "types" condition relies on
      // TypeScript's special .js -> .d.ts substitution for declaration files.
      // tsc implements this and resolves it correctly,
      // but eslint-import-resolver-typescript does not,
      // so it false-positives here.
      "import/no-unresolved": [
        "error",
        { ignore: ["^@modelcontextprotocol/sdk/"] },
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
