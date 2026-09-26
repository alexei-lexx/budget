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
      const result = await context.telegramBotService.findOneConnectedByUserId(
        user.id,
      );

      return result.unwrapOrThrowAs(GraphQLError) ?? undefined;
    },

    testTelegramBot: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.telegramBotService.test(user.id);

      return result.unwrapOrThrowAs(GraphQLError);
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

      return result.unwrapOrThrowAs(GraphQLError);
    },

    disconnectTelegramBot: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.telegramBotService.disconnect(user.id);

      return result.unwrapOrThrowAs(GraphQLError);
    },
  },
};
