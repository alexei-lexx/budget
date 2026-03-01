import { GraphQLError } from "graphql";
import { z } from "zod";
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
  TransactionPatternType,
  TransactionType,
} from "../models/transaction";
import { GraphQLContext } from "../server";
import { BusinessError } from "../services/business-error";
import { toDateString } from "../types/date";
import type {
  TransactionEmbeddedAccount,
  TransactionEmbeddedCategory,
} from "../types/graphql";
import { MAX_PAGE_SIZE, MIN_PAGE_SIZE } from "../types/pagination";
import {
  accountIdSchema,
  amountSchema,
  dateSchema,
  descriptionSchema,
} from "./schemas";
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
  date: dateSchema.transform(toDateString),
  description: descriptionSchema,
});

const updateTransactionInputSchema = z.object({
  id: z.uuid({ message: "Transaction ID must be a valid UUID" }),
  accountId: accountIdSchema.optional(),
  categoryId: nullishCategoryIdSchema,
  type: typeSchema.optional(),
  amount: amountSchema.optional(),
  date: dateSchema
    .optional()
    .transform((value) => (value ? toDateString(value) : undefined)),
  description: descriptionSchema,
});

const paginationInputSchema = z
  .object({
    first: z
      .number()
      .int()
      .min(MIN_PAGE_SIZE, `First must be at least ${MIN_PAGE_SIZE}`)
      .max(MAX_PAGE_SIZE, `First cannot exceed ${MAX_PAGE_SIZE}`)
      .optional(),
    after: z.string().optional(),
  })
  .optional();

const transactionFilterInputSchema = z
  .object({
    accountIds: z.array(accountIdSchema).optional(),
    categoryIds: z.array(categoryIdSchema).optional(),
    includeUncategorized: z.boolean().optional(),
    dateAfter: dateSchema
      .optional()
      .transform((value) => (value ? toDateString(value) : undefined)),
    dateBefore: dateSchema
      .optional()
      .transform((value) => (value ? toDateString(value) : undefined)),
    types: z.array(allTransactionTypesSchema).optional(),
  })
  .optional();

const transactionPatternTypeSchema = z.enum(TransactionPatternType);

export const transactionResolvers = {
  Query: {
    transactions: async (
      _parent: unknown,
      args: QueryTransactionsArgs,
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
      args: QueryTransactionPatternsArgs,
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
      args: MutationCreateTransactionArgs,
      context: GraphQLContext,
    ) => {
      try {
        // Validate and normalize input
        const validatedInput = createTransactionInputSchema.parse(args.input);
        const user = await getAuthenticatedUser(context);

        const transaction = await context.transactionService.createTransaction(
          {
            ...validatedInput,
            categoryId: validatedInput.categoryId ?? undefined,
            description: validatedInput.description ?? undefined,
          },
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
      args: MutationUpdateTransactionArgs,
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
