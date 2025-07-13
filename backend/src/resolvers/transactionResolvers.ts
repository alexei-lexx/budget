import { GraphQLError } from "graphql";
import { z } from "zod";
import { GraphQLContext } from "../server";
import { getAuthenticatedUser, handleResolverError } from "./shared";
import { BusinessError } from "../services/BusinessError";
import { MIN_PAGE_SIZE, MAX_PAGE_SIZE } from "../types/pagination";
import { TRANSACTION_TYPE } from "../constants/types";

/**
 * Constants for validation
 */
const DESCRIPTION_MAX_LENGTH = 500;
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Error messages
const ERROR_MESSAGES = {
  ACCOUNT_ID_UUID: "Account ID must be a valid UUID",
  CATEGORY_ID_UUID: "Category ID must be a valid UUID",
  TRANSACTION_TYPE: "Transaction type must be either INCOME or EXPENSE",
  AMOUNT_NON_NEGATIVE: "Amount must be zero or positive",
  DATE_FORMAT: "Date must be in YYYY-MM-DD format",
  DESCRIPTION_MAX_LENGTH: `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
};

/**
 * Zod schemas for input validation
 */
const createTransactionInputSchema = z.object({
  accountId: z.string().uuid(ERROR_MESSAGES.ACCOUNT_ID_UUID),
  categoryId: z.string().uuid(ERROR_MESSAGES.CATEGORY_ID_UUID).nullish(),
  type: z.enum([TRANSACTION_TYPE.INCOME, TRANSACTION_TYPE.EXPENSE], {
    errorMap: () => ({ message: ERROR_MESSAGES.TRANSACTION_TYPE }),
  }),
  amount: z.number().nonnegative(ERROR_MESSAGES.AMOUNT_NON_NEGATIVE),
  date: z.string().regex(DATE_FORMAT_REGEX, ERROR_MESSAGES.DATE_FORMAT),
  description: z
    .string()
    .max(DESCRIPTION_MAX_LENGTH, ERROR_MESSAGES.DESCRIPTION_MAX_LENGTH)
    .nullish(),
});

const updateTransactionInputSchema = z.object({
  accountId: z.string().uuid(ERROR_MESSAGES.ACCOUNT_ID_UUID).optional(),
  categoryId: z.string().uuid(ERROR_MESSAGES.CATEGORY_ID_UUID).nullish(),
  type: z
    .enum([TRANSACTION_TYPE.INCOME, TRANSACTION_TYPE.EXPENSE], {
      errorMap: () => ({ message: ERROR_MESSAGES.TRANSACTION_TYPE }),
    })
    .optional(),
  amount: z.number().nonnegative(ERROR_MESSAGES.AMOUNT_NON_NEGATIVE).optional(),
  date: z
    .string()
    .regex(DATE_FORMAT_REGEX, ERROR_MESSAGES.DATE_FORMAT)
    .optional(),
  description: z
    .string()
    .max(DESCRIPTION_MAX_LENGTH, ERROR_MESSAGES.DESCRIPTION_MAX_LENGTH)
    .nullish(),
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

export const transactionResolvers = {
  Query: {
    transactions: async (
      _parent: unknown,
      args: { pagination?: unknown },
      context: GraphQLContext,
    ) => {
      try {
        // Validate pagination input (repository handles defaults)
        const validatedPagination = paginationInputSchema.parse(
          args.pagination,
        );
        const user = await getAuthenticatedUser(context);

        const transactionConnection =
          await context.transactionService.getTransactionsByUser(
            user.id,
            validatedPagination,
          );
        return transactionConnection;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.errors[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        handleResolverError(error, "Failed to fetch transactions");
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
          const firstError = error.errors[0];
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
      args: { id: string; input: unknown },
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
        // Validate and normalize input
        const validatedInput = updateTransactionInputSchema.parse(args.input);
        const user = await getAuthenticatedUser(context);

        const transaction = await context.transactionService.updateTransaction(
          id,
          user.id,
          validatedInput,
        );
        return transaction;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.errors[0];
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
