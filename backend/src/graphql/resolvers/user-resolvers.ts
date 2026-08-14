import { GraphQLError } from "graphql";
import { MutationUpdateUserSettingsArgs } from "../../__generated__/resolvers-types";
import { User } from "../../models/user";
import { SUPPORTED_INTERFACE_LANGUAGES } from "../../types/language";
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
    return await context.userService.ensureUser(authUser.email);
  } catch (error) {
    console.error("Error ensuring user:", error);
    throw new GraphQLError("Failed to authenticate user");
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

    supportedInterfaceLanguages: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      try {
        await getAuthenticatedUser(context);
        return [...SUPPORTED_INTERFACE_LANGUAGES];
      } catch (error) {
        handleResolverError(
          error,
          "Failed to fetch supported interface languages",
        );
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
          interfaceLanguage: args.input.interfaceLanguage ?? undefined,
        });

        if (!result.success) {
          throw new GraphQLError(result.error);
        }

        return result.data;
      } catch (error) {
        handleResolverError(error, "Failed to update user settings");
      }
    },

    regenerateMcpToken: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const result = await context.userService.regenerateMcpToken(user.id);

        if (!result.success) {
          throw new GraphQLError(result.error);
        }

        return result.data;
      } catch (error) {
        handleResolverError(error, "Failed to regenerate MCP token");
      }
    },
  },
};
