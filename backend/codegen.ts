import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "src/schema.graphql",
  generates: {
    "src/__generated__/resolvers-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        // Provides GraphQL context type with auth, repositories, and services
        contextType: "../server#GraphQLContext",
        // Use undefined instead of null for optional GraphQL inputs (matches TypeScript conventions)
        inputMaybeValue: "T | undefined",
        // Use undefined instead of null for nullable GraphQL outputs (matches TypeScript conventions)
        maybeValue: "T | undefined",
        // Map GraphQL enums to model enums to avoid type mismatches
        enumValues: {
          CategoryType: "../models/Category#CategoryType",
          ReportType: "../models/Report#ReportType",
          TransactionType: "../models/Transaction#TransactionType",
        },
        // Map GraphQL types to model types for field resolvers and computed fields
        mappers: {
          // Account balance is computed by field resolver, so exclude from base type
          Account: "Omit<Account, 'balance'>",
          // Transaction account and category are computed by field resolvers via DataLoaders, exclude from parent type
          Transaction: "Omit<Transaction, 'account' | 'category'>",
        },
      },
    },
  },
};

export default config;
