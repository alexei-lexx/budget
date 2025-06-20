import { GraphQLError } from "graphql";
import { GraphQLContext } from "./server";

export const resolvers = {
  Mutation: {
    ensureUser: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      // Check authentication
      if (!context.auth.isAuthenticated || !context.auth.user) {
        throw new GraphQLError("Authentication required", {
          extensions: {
            code: "UNAUTHENTICATED",
          },
        });
      }

      const { auth0UserId, email } = context.auth.user;

      // Validate required fields
      if (!email) {
        throw new GraphQLError("Email is required for user creation", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      try {
        // Use repository's ensureUser method which handles existence checking
        const user = await context.userRepository.ensureUser(
          auth0UserId,
          email,
        );
        return user;
      } catch (error) {
        console.error("Error ensuring user:", error);
        throw new GraphQLError("Failed to create or retrieve user", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
          },
        });
      }
    },
  },
};
