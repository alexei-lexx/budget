import { GraphQLError } from "graphql";
import { User } from "../../models/user";
import { BusinessError } from "../../services/business-error";
import { RepositoryError } from "../../services/ports/repository-error";
import { InvalidDateStringError } from "../../types/date";
import { GraphQLContext } from "../context";

/**
 * Helper function to check authentication and return auth user
 */
export function requireAuthentication(context: GraphQLContext) {
  if (!context.auth.isAuthenticated || !context.auth.user) {
    throw new GraphQLError("Authentication required");
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
    const user = await context.userRepository.findOneByEmail(authUser.email);

    if (!user) {
      throw new GraphQLError("User not found");
    }

    return user;
  } catch (error) {
    console.error("Error getting user:", error);
    if (error instanceof GraphQLError) {
      throw error;
    }
    throw new GraphQLError("Failed to authenticate user");
  }
}

/**
 * Helper function to handle repository errors and other errors
 */
export function handleResolverError(
  error: unknown,
  defaultMessage: string,
): never {
  if (error instanceof GraphQLError) {
    throw error;
  }

  // User-facing: invalid input the user can correct
  if (error instanceof InvalidDateStringError) {
    throw new GraphQLError(error.message);
  }

  // User-facing: business rule violation the user needs to act on
  if (error instanceof BusinessError) {
    throw new GraphQLError(error.message);
  }

  // Internal: log full details for debugging, hide from client
  console.error(defaultMessage, error);

  if (error instanceof RepositoryError) {
    throw new GraphQLError(defaultMessage);
  }

  throw new GraphQLError(defaultMessage);
}
