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
      const bot = await context.telegramBotService.findOneConnectedByUserId(
        user.id,
      );
      return bot ?? undefined;
    },

    testTelegramBot: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      return context.telegramBotService.test(user.id);
    },
  },
  Mutation: {
    connectTelegramBot: async (
      _parent: unknown,
      args: MutationConnectTelegramBotArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      return context.telegramBotService.connect(user.id, args.token);
    },

    disconnectTelegramBot: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      return context.telegramBotService.disconnect(user.id);
    },
  },
};
