import { GraphQLError } from "graphql";
import {
  MutationCreateAccountArgs,
  MutationDeleteAccountArgs,
  MutationUpdateAccountArgs,
} from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser } from "./shared";

export const accountResolvers = {
  Query: {
    accounts: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.accountService.getAccountsByUser(
        user.id,
        "ACTIVE",
      );

      return result.unwrapOrThrowAs(GraphQLError);
    },
    supportedCurrencies: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.currencyService.getSupportedCurrencies({
        userId: user.id,
      });

      return result.unwrapOrThrowAs(GraphQLError);
    },
  },
  Mutation: {
    createAccount: async (
      _parent: unknown,
      args: MutationCreateAccountArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);

      const result = await context.accountService.createAccount({
        userId: user.id,
        name: args.input.name,
        currency: args.input.currency,
        initialBalance: args.input.initialBalance,
      });

      return result.unwrapOrThrowAs(GraphQLError);
    },
    updateAccount: async (
      _parent: unknown,
      args: MutationUpdateAccountArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const { id, ...updateData } = args.input;

      const result = await context.accountService.updateAccount(id, user.id, {
        ...updateData,
        currency: updateData.currency ?? undefined,
        initialBalance: updateData.initialBalance ?? undefined,
        name: updateData.name ?? undefined,
      });

      return result.unwrapOrThrowAs(GraphQLError);
    },
    deleteAccount: async (
      _parent: unknown,
      args: MutationDeleteAccountArgs,
      context: GraphQLContext,
    ) => {
      const { id } = args;

      // Validate input
      if (!id) {
        throw new GraphQLError("Account ID is required");
      }

      const user = await getAuthenticatedUser(context);
      const result = await context.accountService.deleteAccount(id, user.id);

      result.unwrapOrThrowAs(GraphQLError);

      return undefined;
    },
  },
};
