import { GraphQLError } from "graphql";
import { GraphQLContext } from "../server";
import { AccountRepositoryError } from "../repositories/AccountRepository";
import { User } from "../models/User";

/**
 * Helper function to check authentication and return auth user
 */
export function requireAuthentication(context: GraphQLContext) {
  if (!context.auth.isAuthenticated || !context.auth.user) {
    throw new GraphQLError("Authentication required", {
      extensions: {
        code: "UNAUTHENTICATED",
      },
    });
  }
  return context.auth.user;
}

/**
 * Helper function to get authenticated user from context
 * Handles authentication check and user lookup
 */
export async function getAuthenticatedUser(
  context: GraphQLContext,
): Promise<User> {
  const authUser = requireAuthentication(context);

  try {
    // Get existing user from database
    const user = await context.userRepository.findByAuth0UserId(
      authUser.auth0UserId,
    );

    if (!user) {
      throw new GraphQLError("User not found", {
        extensions: {
          code: "USER_NOT_FOUND",
        },
      });
    }

    return user;
  } catch (error) {
    console.error("Error getting user:", error);
    if (error instanceof GraphQLError) {
      throw error;
    }
    throw new GraphQLError("Failed to authenticate user", {
      extensions: {
        code: "AUTHENTICATION_ERROR",
      },
    });
  }
}

/**
 * Helper function for ensureUser mutation that creates user if needed
 */
export async function ensureAuthenticatedUser(
  context: GraphQLContext,
): Promise<User> {
  const authUser = requireAuthentication(context);

  try {
    // Ensure user exists in our database
    const user = await context.userRepository.ensureUser(
      authUser.auth0UserId,
      authUser.email || "",
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

/**
 * Helper function to handle AccountRepositoryError and other errors
 */
export function handleResolverError(
  error: unknown,
  defaultMessage: string,
): never {
  console.error(`Resolver error: ${defaultMessage}`, error);

  if (error instanceof AccountRepositoryError) {
    throw new GraphQLError(error.message, {
      extensions: {
        code: error.code,
      },
    });
  }

  throw new GraphQLError(defaultMessage, {
    extensions: {
      code: "INTERNAL_SERVER_ERROR",
    },
  });
}
