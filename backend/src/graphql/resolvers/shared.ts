import { GraphQLError } from "graphql";
import { User } from "../../models/user";
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
  const user = await context.userRepository.findOneByEmail(authUser.email);

  if (!user) {
    throw new GraphQLError("User not found");
  }

  return user;
}
