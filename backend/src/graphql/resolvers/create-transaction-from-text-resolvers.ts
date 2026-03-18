import { MutationCreateTransactionFromTextArgs } from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";

import { getAuthenticatedUser, handleResolverError } from "./shared";

export const createTransactionFromTextResolvers = {
  Mutation: {
    createTransactionFromText: async (
      _parent: unknown,
      args: MutationCreateTransactionFromTextArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const result = await context.createTransactionFromTextService.call(
          user.id,
          args.input.text,
        );

        if (!result.success) {
          return {
            __typename: "CreateTransactionFromTextFailure" as const,
            message: result.error.message,
            agentTrace: result.error.agentTrace,
          };
        }

        return {
          __typename: "CreateTransactionFromTextSuccess" as const,
          transaction: result.data.transaction,
          agentTrace: result.data.agentTrace,
        };
      } catch (error) {
        handleResolverError(error, "Failed to create transaction from text");
      }
    },
  },
};
