import { GraphQLError } from "graphql";
import { MutationUpdateUserSettingsArgs } from "../../__generated__/resolvers-types";
import { User } from "../../models/user";
import { GraphQLContext } from "../context";
import {
  getAuthenticatedUser,
  handleResolverError,
  requireAuthentication,
} from "./shared";

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
  Query: {
    userSettings: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const result = await context.userService.getSettings(user.id);

        if (!result.success) {
          throw new GraphQLError(result.error);
        }

        return result.data;
      } catch (error) {
        handleResolverError(error, "Failed to fetch user settings");
      }
    },
  },
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

    updateUserSettings: async (
      _parent: unknown,
      args: MutationUpdateUserSettingsArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const result = await context.userService.updateSettings({
          userId: user.id,
          voiceInputLanguage: args.input.voiceInputLanguage ?? undefined,
          transactionPatternsLimit:
            args.input.transactionPatternsLimit ?? undefined,
        });

        if (!result.success) {
          throw new GraphQLError(result.error);
        }

        return result.data;
      } catch (error) {
        handleResolverError(error, "Failed to update user settings");
      }
    },
  },
};
