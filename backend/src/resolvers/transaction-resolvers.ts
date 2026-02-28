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
  TransactionPatternType,
} from "../models/transaction";
import { GraphQLContext } from "../server";
import { toDateString } from "../types/date";
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
        const user = await getAuthenticatedUser(context);
        const filters = args.filters
          ? {
              ...args.filters,
              dateAfter: args.filters.dateAfter
                ? toDateString(args.filters.dateAfter)
                : undefined,
              dateBefore: args.filters.dateBefore
                ? toDateString(args.filters.dateBefore)
                : undefined,
            }
          : undefined;
        const transactionConnection =
          await context.transactionService.getTransactionsByUser(
            user.id,
            args.pagination ?? undefined,
            filters,
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
            // args.type is the generated TransactionPatternType; cast to model type since values are identical
            args.type as unknown as TransactionPatternType,
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
      try {
        const user = await getAuthenticatedUser(context);
        const suggestions =
          await context.transactionService.getDescriptionSuggestions(
            user.id,
            args.searchText,
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
            type: args.input.type as unknown as NonTransferTransactionType,
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
        const { id, ...updateData } = args.input;
        const transaction = await context.transactionService.updateTransaction(
          id,
          user.id,
          {
            ...updateData,
            date: updateData.date ? toDateString(updateData.date) : undefined,
            type: updateData.type as unknown as
              | NonTransferTransactionType
              | undefined,
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
