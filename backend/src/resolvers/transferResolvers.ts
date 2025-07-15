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

/**
 * Reusable schema components for transfers
 */
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

export const transferResolvers = {
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
  },
};
