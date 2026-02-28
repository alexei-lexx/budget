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
  Transaction as TransactionModel,
  TransactionType,
} from "../models/transaction";
import { GraphQLContext } from "../server";
import { toDateString, toDateStringUndefined } from "../types/date";
import type {
  TransactionEmbeddedAccount,
  TransactionEmbeddedCategory,
} from "../types/graphql";
import { MAX_PAGE_SIZE, MIN_PAGE_SIZE } from "../types/pagination";
import { DESCRIPTION_MAX_LENGTH } from "../types/validation";
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
        // Validate pagination input (repository handles defaults)
        if (
          pagination?.first !== undefined &&
          (pagination?.first < MIN_PAGE_SIZE ||
            pagination?.first > MAX_PAGE_SIZE)
        ) {
          throw new GraphQLError(
            `First must be between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}`,
            {
              extensions: { code: "BAD_USER_INPUT" },
            },
          );
        }

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
        // Validate amount
        if (args.input.amount <= 0) {
          throw new GraphQLError("Amount must be positive", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        // Validate description
        if (
          args.input.description &&
          args.input.description.length > DESCRIPTION_MAX_LENGTH
        ) {
          throw new GraphQLError(
            `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
            {
              extensions: { code: "BAD_USER_INPUT" },
            },
          );
        }

        // Validate type
        if (
          args.input.type !== TransactionType.INCOME &&
          args.input.type !== TransactionType.EXPENSE &&
          args.input.type !== TransactionType.REFUND
        ) {
          throw new GraphQLError(
            `Transaction type must be either ${TransactionType.INCOME}, ${TransactionType.EXPENSE}, or ${TransactionType.REFUND}`,
            {
              extensions: { code: "BAD_USER_INPUT" },
            },
          );
        }

        const user = await getAuthenticatedUser(context);

        const transaction = await context.transactionService.createTransaction(
          {
            ...args.input,
            date: toDateString(args.input.date),
            type: args.input.type,
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
        // Validate amount
        if (args.input.amount !== undefined && args.input.amount <= 0) {
          throw new GraphQLError("Amount must be positive", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        // Validate description
        if (
          args.input.description !== undefined &&
          args.input.description.length > DESCRIPTION_MAX_LENGTH
        ) {
          throw new GraphQLError(
            `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
            {
              extensions: { code: "BAD_USER_INPUT" },
            },
          );
        }

        // Validate type
        if (
          args.input.type !== undefined &&
          args.input.type !== TransactionType.INCOME &&
          args.input.type !== TransactionType.EXPENSE &&
          args.input.type !== TransactionType.REFUND
        ) {
          throw new GraphQLError(
            `Transaction type must be either ${TransactionType.INCOME}, ${TransactionType.EXPENSE}, or ${TransactionType.REFUND}`,
            {
              extensions: { code: "BAD_USER_INPUT" },
            },
          );
        }

        const user = await getAuthenticatedUser(context);
        const { id } = args.input;

        const transaction = await context.transactionService.updateTransaction(
          id,
          user.id,
          {
            ...args.input,
            date:
              args.input.date !== undefined
                ? toDateString(args.input.date)
                : undefined,
            type: args.input.type,
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
