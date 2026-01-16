import { GraphQLError } from "graphql";
import { z } from "zod";
import { GraphQLContext } from "../server";
import { getAuthenticatedUser, handleResolverError } from "./shared";

/**
 * Supported currency codes
 */
const SUPPORTED_CURRENCIES = new Set(["EUR", "USD"]);

/**
 * Reusable schema components for accounts
 */
const nameSchema = z
  .string()
  .trim()
  .min(1, "Account name cannot be empty")
  .max(100, "Account name cannot exceed 100 characters");

const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((val) => SUPPORTED_CURRENCIES.has(val), {
    message: `Unsupported currency. Supported currencies: ${Array.from(SUPPORTED_CURRENCIES).join(", ")}`,
  });

const initialBalanceSchema = z.number({
  message: "Initial balance must be a valid number",
});

/**
 * Zod schemas for input validation
 */
const createAccountInputSchema = z.object({
  name: nameSchema,
  currency: currencySchema,
  initialBalance: initialBalanceSchema,
});

const updateAccountInputSchema = z.object({
  id: z.uuid({ message: "Account ID must be a valid UUID" }),
  name: nameSchema.optional(),
  currency: currencySchema.optional(),
  initialBalance: initialBalanceSchema.optional(),
});

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
      args: {
        input: { name: string; currency: string; initialBalance: number };
      },
      context: GraphQLContext,
    ) => {
      try {
        // Validate and normalize input
        const validatedInput = createAccountInputSchema.parse(args.input);
        const user = await getAuthenticatedUser(context);

        const account = await context.accountService.createAccount({
          userId: user.id,
          name: validatedInput.name,
          currency: validatedInput.currency,
          initialBalance: validatedInput.initialBalance,
        });
        return account;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.issues[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        handleResolverError(error, "Failed to create account");
      }
    },
    updateAccount: async (
      _parent: unknown,
      args: { input: unknown },
      context: GraphQLContext,
    ) => {
      try {
        // Validate and normalize input
        const validatedInput = updateAccountInputSchema.parse(args.input);
        const user = await getAuthenticatedUser(context);
        const { id, ...updateData } = validatedInput;

        const account = await context.accountService.updateAccount(
          id,
          user.id,
          updateData,
        );
        return account;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.issues[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        handleResolverError(error, "Failed to update account");
      }
    },
    deleteAccount: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext,
    ) => {
      const { id } = args;

      // Validate input
      if (!id) {
        throw new GraphQLError("Account ID is required", {
          extensions: { code: "BAD_USER_INPUT" },
        });
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
