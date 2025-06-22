import { GraphQLContext } from "../server";
import { ensureAuthenticatedUser, handleResolverError } from "./shared";

export const userResolvers = {
  Mutation: {
    ensureUser: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      try {
        const user = await ensureAuthenticatedUser(context);
        return user;
      } catch (error) {
        handleResolverError(error, "Failed to create or retrieve user");
      }
    },
  },
};
