import { GraphQLError } from "graphql";
import { MutationConnectTelegramBotArgs } from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const telegramBotResolvers = {
  Query: {
    telegramBot: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const result =
          await context.telegramBotService.findOneConnectedByUserId(user.id);

        if (!result.success) {
          throw new GraphQLError(result.error);
        }

        return result.data ?? undefined;
      } catch (error) {
        handleResolverError(error, "Failed to fetch Telegram bot");
      }
    },
  },
  Mutation: {
    connectTelegramBot: async (
      _parent: unknown,
      args: MutationConnectTelegramBotArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const result = await context.telegramBotService.connect(
          user.id,
          args.token,
        );

        if (!result.success) {
          throw new GraphQLError(result.error);
        }

        return result.data;
      } catch (error) {
        handleResolverError(error, "Failed to connect Telegram bot");
      }
    },

    disconnectTelegramBot: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const result = await context.telegramBotService.disconnect(user.id);

        if (!result.success) {
          throw new GraphQLError(result.error);
        }

        return result.data;
      } catch (error) {
        handleResolverError(error, "Failed to disconnect Telegram bot");
      }
    },

    testTelegramBot: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const result = await context.telegramBotService.test(user.id);

        if (!result.success) {
          throw new GraphQLError(result.error);
        }

        return result.data;
      } catch (error) {
        handleResolverError(error, "Failed to test Telegram bot");
      }
    },
  },
};
