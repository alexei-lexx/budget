import { GraphQLError } from "graphql";
import { User } from "../../models/user";

import { GraphQLContext } from "../context";
import { handleResolverError, requireAuthentication } from "./shared";

/**
 * Helper function for ensureUser mutation that creates user if needed
 */
async function ensureAuthenticatedUser(context: GraphQLContext): Promise<User> {
  const authUser = requireAuthentication(context);

  try {
    // Email is already normalized and available in auth context
    const email = authUser.email;

    // Check if user already exists
    const existingUser = await context.userRepository.findByEmail(email);

    if (existingUser) {
      console.log("[RESOLVER] User already exists");
      return existingUser;
    }

    const user = await context.userRepository.ensureUser(email);
    return user;
  } catch (error) {
    console.error("Error ensuring user:", error);
    throw new GraphQLError("Failed to authenticate user", {
      extensions: {
        code: "AUTHENTICATION_ERROR",
      },
    });
  }
}

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
