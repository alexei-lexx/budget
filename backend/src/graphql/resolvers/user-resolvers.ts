import { GraphQLError } from "graphql";
import { MutationUpdateUserSettingsArgs } from "../../__generated__/resolvers-types";
import { User } from "../../models/user";
import { SUPPORTED_INTERFACE_LANGUAGES } from "../../types/language";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser, requireAuthentication } from "./shared";

/**
 * Helper function for ensureUser mutation that creates user if needed
 */
async function ensureAuthenticatedUser(context: GraphQLContext): Promise<User> {
  const authUser = requireAuthentication(context);
  return await context.userService.ensureUser(authUser.email);
}

export const userResolvers = {
  Query: {
    supportedInterfaceLanguages: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      await getAuthenticatedUser(context);
      return [...SUPPORTED_INTERFACE_LANGUAGES];
    },
    userSettings: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.userService.getSettings(user.id);

      if (!result.success) {
        throw new GraphQLError(result.error);
      }

      return result.data;
    },
  },
  Mutation: {
    ensureUser: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      return await ensureAuthenticatedUser(context);
    },

    updateUserSettings: async (
      _parent: unknown,
      args: MutationUpdateUserSettingsArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.userService.updateSettings({
        userId: user.id,
        voiceInputLanguage: args.input.voiceInputLanguage ?? undefined,
        interfaceLanguage: args.input.interfaceLanguage ?? undefined,
        transactionPatternsLimit:
          args.input.transactionPatternsLimit ?? undefined,
      });

      if (!result.success) {
        throw new GraphQLError(result.error);
      }

      return result.data;
    },

    regenerateMcpToken: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.userService.regenerateMcpToken(user.id);

      if (!result.success) {
        throw new GraphQLError(result.error);
      }

      return result.data;
    },
  },
};
