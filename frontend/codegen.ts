import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "src/schema.graphql", // Local schema file copied from backend
  documents: "src/graphql/**/*.ts", // GraphQL operations
  generates: {
    "src/__generated__/graphql-types.ts": {
      plugins: ["typescript", "typescript-operations"],
      config: {
        useIndexSignature: true,
        maybeValue: "T | undefined",
        enumsAsTypes: true,
      },
    },
    "src/__generated__/vue-apollo.ts": {
      plugins: ["typescript", "typescript-operations", "typescript-vue-apollo"],
      config: {
        useIndexSignature: true,
        maybeValue: "T | undefined",
        vueCompositionApiImportFrom: "vue",
        apolloClientInstanceImport: "@/apollo#apolloClient",
        enumsAsTypes: true,
      },
    },
  },
};

export default config;
