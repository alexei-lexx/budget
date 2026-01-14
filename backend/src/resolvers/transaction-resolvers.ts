import { GraphQLError } from "graphql";
import { z } from "zod";
import {
  Transaction as TransactionModel,
  TransactionPatternType,
  TransactionType,
} from "../models/transaction";
import { GraphQLContext } from "../server";
import { BusinessError } from "../services/business-error";
import type {
  TransactionEmbeddedAccount,
  TransactionEmbeddedCategory,
} from "../types/graphql";
import {
  accountIdSchema,
  amountSchema,
  dateSchema,
  descriptionSchema,
  paginationInputSchema,
  transactionIdSchema,
} from "./common-schemas";
import { getAuthenticatedUser, handleResolverError } from "./shared";

/**
 * Reusable schema components for transactions
 */
const categoryIdSchema = z.uuid({
  message: "Category ID must be a valid UUID",
});
const nullishCategoryIdSchema = categoryIdSchema.nullish();
const typeSchema = z.enum(
  [TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.REFUND],
  {
    message: `Transaction type must be either ${TransactionType.INCOME}, ${TransactionType.EXPENSE}, or ${TransactionType.REFUND}`,
  },
);
const allTransactionTypesSchema = z.enum(TransactionType);

/**
 * Zod schemas for input validation
 */
const createTransactionInputSchema = z.object({
  accountId: accountIdSchema,
  categoryId: nullishCategoryIdSchema,
  type: typeSchema,
  amount: amountSchema,
  date: dateSchema,
  description: descriptionSchema,
});

const updateTransactionInputSchema = z.object({
  id: transactionIdSchema,
  accountId: accountIdSchema.optional(),
  categoryId: nullishCategoryIdSchema,
  type: typeSchema.optional(),
  amount: amountSchema.optional(),
  date: dateSchema.optional(),
  description: descriptionSchema,
});

const transactionFilterInputSchema = z
  .object({
    accountIds: z.array(accountIdSchema).optional(),
    categoryIds: z.array(categoryIdSchema).optional(),
    includeUncategorized: z.boolean().optional(),
    dateAfter: dateSchema.optional(),
    dateBefore: dateSchema.optional(),
    types: z.array(allTransactionTypesSchema).optional(),
  })
  .optional();

const transactionPatternTypeSchema = z.enum(TransactionPatternType);

export const transactionResolvers = {
  Query: {
    transactions: async (
      _parent: unknown,
      args: { pagination?: unknown; filters?: unknown },
      context: GraphQLContext,
    ) => {
      try {
        // Validate pagination input (repository handles defaults)
        const validatedPagination = paginationInputSchema.parse(
          args.pagination,
        );
        // Validate filters input
        const validatedFilters = transactionFilterInputSchema.parse(
          args.filters,
        );
        const user = await getAuthenticatedUser(context);

        const transactionConnection =
          await context.transactionService.getTransactionsByUser(
            user.id,
            validatedPagination,
            validatedFilters,
          );
        return transactionConnection;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.issues[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        handleResolverError(error, "Failed to fetch transactions");
      }
    },
    transactionPatterns: async (
      _parent: unknown,
      args: { type: unknown },
      context: GraphQLContext,
    ) => {
      try {
        const validatedTransactionPatternType =
          transactionPatternTypeSchema.parse(args.type);
        const user = await getAuthenticatedUser(context);

        const patterns =
          await context.transactionService.getTransactionPatterns(
            user.id,
            validatedTransactionPatternType,
            user.transactionPatternsLimit,
          );

        return patterns;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.issues[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        handleResolverError(error, "Failed to fetch transaction patterns");
      }
    },
    transactionDescriptionSuggestions: async (
      _parent: unknown,
      args: { searchText: string },
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
        if (error instanceof BusinessError) {
          throw new GraphQLError(error.message, {
            extensions: { code: error.code, details: error.details },
          });
        }
        handleResolverError(error, "Failed to fetch description suggestions");
      }
    },
  },
  Mutation: {
    createTransaction: async (
      _parent: unknown,
      args: { input: unknown },
      context: GraphQLContext,
    ) => {
      try {
        // Validate and normalize input
        const validatedInput = createTransactionInputSchema.parse(args.input);
        const user = await getAuthenticatedUser(context);

        const transaction = await context.transactionService.createTransaction(
          validatedInput,
          user.id,
        );
        return transaction;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.issues[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        if (error instanceof BusinessError) {
          throw new GraphQLError(error.message, {
            extensions: { code: error.code, details: error.details },
          });
        }
        handleResolverError(error, "Failed to create transaction");
      }
    },
    updateTransaction: async (
      _parent: unknown,
      args: { input: unknown },
      context: GraphQLContext,
    ) => {
      try {
        // Validate and normalize input
        const validatedInput = updateTransactionInputSchema.parse(args.input);
        const user = await getAuthenticatedUser(context);
        const { id } = validatedInput;

        const transaction = await context.transactionService.updateTransaction(
          id,
          user.id,
          validatedInput,
        );
        return transaction;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.issues[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        if (error instanceof BusinessError) {
          throw new GraphQLError(error.message, {
            extensions: { code: error.code, details: error.details },
          });
        }
        handleResolverError(error, "Failed to update transaction");
      }
    },
    deleteTransaction: async (
      _parent: unknown,
      args: { id: string },
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
        if (error instanceof BusinessError) {
          throw new GraphQLError(error.message, {
            extensions: { code: error.code, details: error.details },
          });
        }
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
