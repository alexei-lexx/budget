import { MutationCreateTransactionFromTextArgs } from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";

import { getAuthenticatedUser } from "./shared";

export const createTransactionFromTextResolvers = {
  Mutation: {
    createTransactionFromText: async (
      _parent: unknown,
      args: MutationCreateTransactionFromTextArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.createTransactionFromTextService.call({
        userId: user.id,
        text: args.input.text,
        isVoiceInput: args.input.isVoiceInput ?? false,
      });

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
    },
  },
};
