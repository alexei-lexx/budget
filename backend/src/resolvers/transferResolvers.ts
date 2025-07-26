import { GraphQLError } from "graphql";
import { z } from "zod";
import { GraphQLContext } from "../server";
import { getAuthenticatedUser, handleResolverError } from "./shared";
import { BusinessError } from "../services/BusinessError";
import {
  DATE_FORMAT_REGEX,
  DATE_FORMAT_ERROR_MESSAGE,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_LENGTH_ERROR_MESSAGE,
} from "../types/validation";
import {
  TransactionType,
  type Transfer,
} from "../__generated__/resolvers-types";

/**
 * Reusable schema components for transfers
 */
const idSchema = z.string().uuid("ID must be a valid UUID");
const accountIdSchema = z.string().uuid("Account ID must be a valid UUID");
const amountSchema = z.number().positive("Amount must be positive");
const dateSchema = z
  .string()
  .regex(DATE_FORMAT_REGEX, DATE_FORMAT_ERROR_MESSAGE);
const descriptionSchema = z
  .string()
  .max(DESCRIPTION_MAX_LENGTH, DESCRIPTION_LENGTH_ERROR_MESSAGE)
  .nullish();

/**
 * Zod schema for transfer input validation
 */
const createTransferInputSchema = z.object({
  fromAccountId: accountIdSchema,
  toAccountId: accountIdSchema,
  amount: amountSchema,
  date: dateSchema,
  description: descriptionSchema,
});

/**
 * Zod schema for update transfer input validation
 */
const updateTransferInputSchema = z.object({
  id: idSchema,
  fromAccountId: accountIdSchema.optional(),
  toAccountId: accountIdSchema.optional(),
  amount: amountSchema.optional(),
  date: dateSchema.optional(),
  description: descriptionSchema,
});

export const transferResolvers = {
  Query: {
    transfer: async (
      _parent: unknown,
      args: { id: unknown },
      context: GraphQLContext,
    ): Promise<Transfer | undefined> => {
      try {
        // Validate and normalize input
        const id = idSchema.parse(args.id);
        const user = await getAuthenticatedUser(context);

        // Get transfer transactions using the existing method
        const transferTransactions =
          await context.transactionRepository.findByTransferId(id, user.id);

        // Check if transfer exists
        if (transferTransactions.length === 0) {
          return undefined; // Return undefined if transfer not found (GraphQL convention for Maybe types)
        }

        // Validate we have exactly 2 transactions
        if (transferTransactions.length !== 2) {
          throw new BusinessError(
            `Invalid transfer state: expected 2 transactions, found ${transferTransactions.length}`,
            "INVALID_TRANSFER_STATE",
            {
              transferId: id,
              userId: user.id,
              transactionCount: transferTransactions.length,
            },
          );
        }

        // Identify outbound and inbound transactions
        const outboundTransaction = transferTransactions.find(
          (t) => t.type === TransactionType.TRANSFER_OUT,
        );
        const inboundTransaction = transferTransactions.find(
          (t) => t.type === TransactionType.TRANSFER_IN,
        );

        if (!outboundTransaction) {
          throw new BusinessError(
            "Invalid transfer state: missing TRANSFER_OUT transaction",
            "INVALID_TRANSFER_STATE",
            {
              transferId: id,
              userId: user.id,
              missingTransactionType: TransactionType.TRANSFER_OUT,
              foundTransactionTypes: transferTransactions.map((t) => t.type),
            },
          );
        }

        if (!inboundTransaction) {
          throw new BusinessError(
            "Invalid transfer state: missing TRANSFER_IN transaction",
            "INVALID_TRANSFER_STATE",
            {
              transferId: id,
              userId: user.id,
              missingTransactionType: TransactionType.TRANSFER_IN,
              foundTransactionTypes: transferTransactions.map((t) => t.type),
            },
          );
        }

        // Return the transfer object that matches the GraphQL Transfer type
        return {
          id: id,
          outboundTransaction,
          inboundTransaction,
        };
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
        handleResolverError(error, "Failed to get transfer");
      }
    },
  },
  Mutation: {
    createTransfer: async (
      _parent: unknown,
      args: { input: unknown },
      context: GraphQLContext,
    ) => {
      try {
        // Validate and normalize input
        const validatedInput = createTransferInputSchema.parse(args.input);
        const user = await getAuthenticatedUser(context);

        const transferResult = await context.transferService.createTransfer(
          validatedInput,
          user.id,
        );

        // Return the transfer object that matches the GraphQL Transfer type
        return {
          id: transferResult.transferId,
          outboundTransaction: transferResult.outboundTransaction,
          inboundTransaction: transferResult.inboundTransaction,
        };
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
        handleResolverError(error, "Failed to create transfer");
      }
    },
    updateTransfer: async (
      _parent: unknown,
      args: { input: unknown },
      context: GraphQLContext,
    ) => {
      try {
        // Validate and normalize input
        const validatedInput = updateTransferInputSchema.parse(args.input);
        const user = await getAuthenticatedUser(context);
        const { id } = validatedInput;

        const transferResult = await context.transferService.updateTransfer(
          id,
          user.id,
          validatedInput,
        );

        // Return the transfer object that matches the GraphQL Transfer type
        return {
          id: transferResult.transferId,
          outboundTransaction: transferResult.outboundTransaction,
          inboundTransaction: transferResult.inboundTransaction,
        };
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
        handleResolverError(error, "Failed to update transfer");
      }
    },
    deleteTransfer: async (
      _parent: unknown,
      args: { id: unknown },
      context: GraphQLContext,
    ) => {
      try {
        // Validate and normalize input
        const validatedId = idSchema.parse(args.id);
        const user = await getAuthenticatedUser(context);

        await context.transferService.deleteTransfer(validatedId, user.id);

        return true;
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
        handleResolverError(error, "Failed to delete transfer");
      }
    },
  },
};
