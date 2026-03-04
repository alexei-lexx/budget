import { MutationCreateTransactionFromTextArgs } from "../__generated__/resolvers-types";
import { GraphQLContext } from "../server";
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
        return await context.createTransactionFromTextService.call(
          user.id,
          args.input.text,
        );
      } catch (error) {
        handleResolverError(error, "Failed to create transaction from text");
      }
    },
  },
};
