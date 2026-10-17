import { MutationConnectTelegramBotArgs } from "../../__generated__/resolvers-types";
import { BadRequestGraphQLError } from "../bad-request-graphql-error";
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

      return result.unwrapOrThrowAs(BadRequestGraphQLError) ?? undefined;
    },

    testTelegramBot: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.telegramBotService.test(user.id);

      return result.unwrapOrThrowAs(BadRequestGraphQLError);
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

      return result.unwrapOrThrowAs(BadRequestGraphQLError);
    },

    disconnectTelegramBot: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.telegramBotService.disconnect(user.id);

      return result.unwrapOrThrowAs(BadRequestGraphQLError);
    },
  },
};
