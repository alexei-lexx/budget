import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "src/graphql/schema.graphql",
  generates: {
    "src/__generated__/resolvers-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        // Provides GraphQL context type with auth, repositories, and services
        contextType: "../graphql/context#GraphQLContext",
        // Inputs distinguish null (client wants to clear/overwrite field) from undefined (field not set, leave unchanged)
        // This PATCH semantics difference is essential; TypeScript must type both so code that crashes on null is caught
        inputMaybeValue: "T | null | undefined",
        // Outputs only use undefined. GraphQL doesn't distinguish null vs omitted on responses
        // Server controls what's sent, so null distinction is unnecessary
        maybeValue: "T | undefined",
        // Map GraphQL enums to model enums to avoid type mismatches
        enumValues: {
          CategoryType: "../models/category#CategoryType",
          ReportType: "../models/report#ReportType",
          TransactionPatternType:
            "../models/transaction#TransactionPatternType",
          TransactionType: "../models/transaction#TransactionType",
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
