import { GraphQLError } from "graphql";
import { User } from "../models/user";
import { AccountRepositoryError } from "../repositories/account-repository";
import { CategoryRepositoryError } from "../repositories/category-repository";
import { GraphQLContext } from "../server";
import { BusinessError } from "../services/business-error";
import { InvalidDateStringError } from "../types/date";

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
    const user = await context.userRepository.findByEmail(authUser.email);

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
 * Helper function to handle repository errors and other errors
 */
export function handleResolverError(
  error: unknown,
  defaultMessage: string,
): never {
  console.error(`Resolver error: ${defaultMessage}`, error);

  if (error instanceof GraphQLError) {
    throw error;
  }

  if (error instanceof InvalidDateStringError) {
    throw new GraphQLError(error.message, {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  if (
    error instanceof AccountRepositoryError ||
    error instanceof CategoryRepositoryError
  ) {
    throw new GraphQLError(error.message, {
      extensions: {
        code: error.code,
      },
    });
  }

  if (error instanceof BusinessError) {
    throw new GraphQLError(error.message, {
      extensions: {
        code: error.code,
        details: error.details,
      },
    });
  }

  throw new GraphQLError(defaultMessage, {
    extensions: {
      code: "INTERNAL_SERVER_ERROR",
    },
  });
}
