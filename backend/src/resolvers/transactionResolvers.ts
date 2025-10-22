import { GraphQLError } from "graphql";
import { z } from "zod";
import { GraphQLContext } from "../server";
import { getAuthenticatedUser, handleResolverError } from "./shared";
import { BusinessError } from "../services/BusinessError";
import { MIN_PAGE_SIZE, MAX_PAGE_SIZE } from "../types/pagination";
import { TransactionType, TransactionPatternType } from "../models/Transaction";
import {
  DATE_FORMAT_REGEX,
  DATE_FORMAT_ERROR_MESSAGE,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_LENGTH_ERROR_MESSAGE,
} from "../types/validation";

/**
 * Reusable schema components for transactions
 */
const accountIdSchema = z.uuid({ message: "Account ID must be a valid UUID" });
const categoryIdSchema = z.uuid({
  message: "Category ID must be a valid UUID",
});
const nullishCategoryIdSchema = categoryIdSchema.nullish();
const typeSchema = z.enum([TransactionType.INCOME, TransactionType.EXPENSE], {
  message: `Transaction type must be either ${TransactionType.INCOME} or ${TransactionType.EXPENSE}`,
});
const allTransactionTypesSchema = z.enum([
  TransactionType.INCOME,
  TransactionType.EXPENSE,
  TransactionType.TRANSFER_IN,
  TransactionType.TRANSFER_OUT,
]);
const amountSchema = z.number().nonnegative("Amount must be zero or positive");
const dateSchema = z
  .string()
  .regex(DATE_FORMAT_REGEX, DATE_FORMAT_ERROR_MESSAGE);
const descriptionSchema = z
  .string()
  .max(DESCRIPTION_MAX_LENGTH, DESCRIPTION_LENGTH_ERROR_MESSAGE)
  .nullish();

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
  id: z.uuid({ message: "Transaction ID must be a valid UUID" }),
  accountId: accountIdSchema.optional(),
  categoryId: nullishCategoryIdSchema,
  type: typeSchema.optional(),
  amount: amountSchema.optional(),
  date: dateSchema.optional(),
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
    dateAfter: dateSchema.optional(),
    dateBefore: dateSchema.optional(),
    types: z.array(allTransactionTypesSchema).optional(),
  })
  .optional();

const transactionPatternTypeSchema = z.enum(
  [TransactionPatternType.INCOME, TransactionPatternType.EXPENSE],
  {
    message: `Type must be either ${TransactionPatternType.INCOME} or ${TransactionPatternType.EXPENSE}`,
  },
);

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
    getTransactionPatterns: async (
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
};
