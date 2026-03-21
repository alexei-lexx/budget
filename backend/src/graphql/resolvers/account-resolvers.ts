import { GraphQLError } from "graphql";
import {
  MutationCreateAccountArgs,
  MutationDeleteAccountArgs,
  MutationUpdateAccountArgs,
} from "../../__generated__/resolvers-types";
import { SUPPORTED_CURRENCIES } from "../../types/validation";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const accountResolvers = {
  Account: {
    balance: async (
      parent: { id: string },
      _args: unknown,
      context: GraphQLContext,
    ): Promise<number> => {
      try {
        const user = await getAuthenticatedUser(context);
        const balance = await context.accountService.calculateBalance(
          parent.id,
          user.id,
        );
        return balance;
      } catch (error) {
        handleResolverError(error, "Failed to calculate account balance");
      }
    },
  },
  Query: {
    accounts: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const accounts = await context.accountService.getAccountsByUser(
          user.id,
        );
        return accounts;
      } catch (error) {
        handleResolverError(error, "Failed to fetch accounts");
      }
    },
    supportedCurrencies: () => {
      return Array.from(SUPPORTED_CURRENCIES);
    },
  },
  Mutation: {
    createAccount: async (
      _parent: unknown,
      args: MutationCreateAccountArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const account = await context.accountService.createAccount({
          userId: user.id,
          name: args.input.name,
          currency: args.input.currency,
          initialBalance: args.input.initialBalance,
        });

        return account;
      } catch (error) {
        handleResolverError(error, "Failed to create account");
      }
    },
    updateAccount: async (
      _parent: unknown,
      args: MutationUpdateAccountArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const { id, ...updateData } = args.input;

        const account = await context.accountService.updateAccount(
          id,
          user.id,
          {
            ...updateData,
            currency: updateData.currency ?? undefined,
            initialBalance: updateData.initialBalance ?? undefined,
            name: updateData.name ?? undefined,
          },
        );

        return account;
      } catch (error) {
        handleResolverError(error, "Failed to update account");
      }
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

      try {
        const user = await getAuthenticatedUser(context);
        await context.accountService.deleteAccount(id, user.id);
        return undefined;
      } catch (error) {
        handleResolverError(error, "Failed to delete account");
      }
    },
  },
};
