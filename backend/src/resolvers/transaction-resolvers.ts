import { GraphQLError } from "graphql";
import {
  MutationCreateTransactionArgs,
  MutationDeleteTransactionArgs,
  MutationUpdateTransactionArgs,
  QueryTransactionDescriptionSuggestionsArgs,
  QueryTransactionPatternsArgs,
  QueryTransactionsArgs,
} from "../__generated__/resolvers-types";
import {
  NonTransferTransactionType,
  Transaction as TransactionModel,
} from "../models/transaction";
import { GraphQLContext } from "../server";
import { toDateString, toDateStringUndefined } from "../types/date";
import type {
  TransactionEmbeddedAccount,
  TransactionEmbeddedCategory,
} from "../types/graphql";
import { getAuthenticatedUser, handleResolverError } from "./shared";


export const transactionResolvers = {
  Query: {
    transactions: async (
      _parent: unknown,
      args: QueryTransactionsArgs,
      context: GraphQLContext,
    ) => {
      try {
        const { filters, pagination } = args;
        const user = await getAuthenticatedUser(context);

        const transactionConnection =
          await context.transactionService.getTransactionsByUser(
            user.id,
            pagination,
            filters && {
              ...filters,
              dateAfter: toDateStringUndefined(filters.dateAfter),
              dateBefore: toDateStringUndefined(filters.dateBefore),
            },
          );
        return transactionConnection;
      } catch (error) {
        handleResolverError(error, "Failed to fetch transactions");
      }
    },
    transactionPatterns: async (
      _parent: unknown,
      args: QueryTransactionPatternsArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const patterns =
          await context.transactionService.getTransactionPatterns(
            user.id,
            args.type,
            user.transactionPatternsLimit,
          );

        return patterns;
      } catch (error) {
        handleResolverError(error, "Failed to fetch transaction patterns");
      }
    },
    transactionDescriptionSuggestions: async (
      _parent: unknown,
      args: QueryTransactionDescriptionSuggestionsArgs,
      context: GraphQLContext,
    ) => {
      const { searchText } = args;

      // Basic validation
      if (!searchText) {
        throw new GraphQLError("Search text is required", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      try {
        const user = await getAuthenticatedUser(context);

        const suggestions =
          await context.transactionService.getDescriptionSuggestions(
            user.id,
            searchText,
          );

        return suggestions;
      } catch (error) {
        handleResolverError(error, "Failed to fetch description suggestions");
      }
    },
  },
  Mutation: {
    createTransaction: async (
      _parent: unknown,
      args: MutationCreateTransactionArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const transaction = await context.transactionService.createTransaction(
          {
            ...args.input,
            date: toDateString(args.input.date),
            type: args.input.type as NonTransferTransactionType,
          },
          user.id,
        );
        return transaction;
      } catch (error) {
        handleResolverError(error, "Failed to create transaction");
      }
    },
    updateTransaction: async (
      _parent: unknown,
      args: MutationUpdateTransactionArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const { id } = args.input;

        const transaction = await context.transactionService.updateTransaction(
          id,
          user.id,
          {
            ...args.input,
            date: toDateStringUndefined(args.input.date ?? undefined),
            type: args.input.type as NonTransferTransactionType | undefined,
          },
        );
        return transaction;
      } catch (error) {
        handleResolverError(error, "Failed to update transaction");
      }
    },
    deleteTransaction: async (
      _parent: unknown,
      args: MutationDeleteTransactionArgs,
      context: GraphQLContext,
    ) => {
      const { id } = args;

      // Validate input
      if (!id) {
        throw new GraphQLError("Transaction ID is required", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      try {
        const user = await getAuthenticatedUser(context);
        const transaction = await context.transactionService.deleteTransaction(
          id,
          user.id,
        );
        return transaction;
      } catch (error) {
        handleResolverError(error, "Failed to delete transaction");
      }
    },
  },
  /**
   * Field resolvers for Transaction type
   * Implements embedding of account and category data via DataLoaders
   */
  Transaction: {
    /**
     * Resolver for account field (non-nullable)
     * Always returns account data or stub account if missing
     */
    account: async (
      parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ): Promise<TransactionEmbeddedAccount> => {
      const transaction = parent as TransactionModel;
      const account = await context.accountLoader.load(transaction.accountId);
      return account;
    },

    /**
     * Resolver for category field (nullable)
     * Returns undefined if categoryId is null (uncategorized transaction)
     * Returns stub category if categoryId is set but entity not found
     */
    category: async (
      parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ): Promise<TransactionEmbeddedCategory | undefined> => {
      const transaction = parent as TransactionModel;

      // If no category assigned, return undefined
      if (!transaction.categoryId) {
        return undefined;
      }

      // Load category via DataLoader
      const category = await context.categoryLoader.load(
        transaction.categoryId,
      );

      return category;
    },
  },
};
