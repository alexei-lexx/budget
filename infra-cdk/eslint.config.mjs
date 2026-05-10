// @ts-check
//
// See https://typescript-eslint.io/getting-started/

import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import-x";
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
    extends: [importPlugin.flatConfigs.recommended],
    settings: {
      "import-x/extensions": [
        ".ts",
        ".tsx",
        ".cts",
        ".mts",
        ".js",
        ".jsx",
        ".cjs",
        ".mjs",
      ],
      "import-x/external-module-folders": [
        "node_modules",
        "node_modules/@types",
      ],
      "import-x/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx", ".cts", ".mts"],
      },
      "import-x/resolver": {
        node: { extensions: [".ts", ".tsx", ".cts", ".mts", ".js", ".jsx"] },
      },
    },
    rules: {
      // AWS SDK uses complex re-export patterns that confuse static named-export analysis
      "import-x/named": "off",
      "import-x/order": [
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
