
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: "src/schema.graphql",
  generates: {
    "src/__generated__/resolvers-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        contextType: "../server#GraphQLContext",
      },
    }
  }
};

export default config;
