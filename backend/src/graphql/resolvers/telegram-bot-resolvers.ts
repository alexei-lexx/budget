import { GraphQLError } from "graphql";
import { MutationConnectTelegramBotArgs } from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser } from "./shared";

export const telegramBotResolvers = {
  Query: {
    telegramBot: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result =
        await context.telegramBotService.findOneConnectedByUserId(user.id);

      if (!result.success) {
        throw new GraphQLError(result.error);
      }

      return result.data ?? undefined;
    },

    testTelegramBot: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.telegramBotService.test(user.id);

      if (!result.success) {
        throw new GraphQLError(result.error);
      }

      return result.data;
    },
  },
  Mutation: {
    connectTelegramBot: async (
      _parent: unknown,
      args: MutationConnectTelegramBotArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.telegramBotService.connect(
        user.id,
        args.token,
      );

      if (!result.success) {
        throw new GraphQLError(result.error);
      }

      return result.data;
    },

    disconnectTelegramBot: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.telegramBotService.disconnect(user.id);

      if (!result.success) {
        throw new GraphQLError(result.error);
      }

      return result.data;
    },
  },
};
