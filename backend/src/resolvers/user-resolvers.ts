import { GraphQLError } from "graphql";
import { User } from "../models/user";
import { GraphQLContext } from "../server";
import { handleResolverError, requireAuthentication } from "./shared";

/**
 * Helper function for ensureUser mutation that creates user if needed
 */
async function ensureAuthenticatedUser(context: GraphQLContext): Promise<User> {
  const authUser = requireAuthentication(context);

  try {
    // Check if user already exists
    const existingUser = await context.userRepository.findByAuth0UserId(
      authUser.auth0UserId,
    );

    if (existingUser) {
      console.log(`[RESOLVER] User already exists, skipping email fetch`);
      return existingUser;
    }

    // User doesn't exist - fetch email from Auth0 and create user
    console.log(`[RESOLVER] User not found, fetching email for user creation`);

    // Fetch email from Auth0 userinfo endpoint for new user creation
    let email = "";
    console.log(
      `[RESOLVER] Fetching email from userinfo endpoint for new user`,
    );
    const userInfo = await context.jwtAuthService.getUserInfoFromHeader(
      context.authHeader,
    );
    if (userInfo) {
      email = userInfo.email || "";
    }

    const user = await context.userRepository.ensureUser(
      authUser.auth0UserId,
      email || "",
    );
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
