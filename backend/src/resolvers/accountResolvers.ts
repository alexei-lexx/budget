import { GraphQLError } from "graphql";
import { z } from "zod";
import { GraphQLContext } from "../server";
import { getAuthenticatedUser, handleResolverError } from "./shared";

/**
 * Supported currency codes
 */
const SUPPORTED_CURRENCIES = new Set(["EUR", "USD"]);

/**
 * Zod schemas for input validation
 */
const createAccountInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Account name cannot be empty")
    .max(100, "Account name cannot exceed 100 characters"),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (val) => SUPPORTED_CURRENCIES.has(val),
      (val) => ({
        message: `Unsupported currency: ${val}. Supported currencies: ${Array.from(SUPPORTED_CURRENCIES).join(", ")}`,
      }),
    ),
  initialBalance: z.number().finite("Initial balance must be a valid number"),
});

const updateAccountInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Account name cannot be empty")
    .max(100, "Account name cannot exceed 100 characters")
    .optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (val) => SUPPORTED_CURRENCIES.has(val),
      (val) => ({
        message: `Unsupported currency: ${val}. Supported currencies: ${Array.from(SUPPORTED_CURRENCIES).join(", ")}`,
      }),
    )
    .optional(),
  initialBalance: z
    .number()
    .finite("Initial balance must be a valid number")
    .optional(),
});

export const accountResolvers = {
  Query: {
    activeAccounts: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const accounts = await context.accountRepository.findActiveByUserId(
          user.id,
        );
        return accounts;
      } catch (error) {
        handleResolverError(error, "Failed to fetch active accounts");
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

        const account = await context.accountRepository.create({
          userId: user.id,
          name: validatedInput.name,
          currency: validatedInput.currency,
          initialBalance: validatedInput.initialBalance,
        });
        return account;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.errors[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        handleResolverError(error, "Failed to create account");
      }
    },
    updateAccount: async (
      _parent: unknown,
      args: {
        id: string;
        input: { name?: string; currency?: string; initialBalance?: number };
      },
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
        // Validate and normalize input
        const validatedInput = updateAccountInputSchema.parse(args.input);
        const user = await getAuthenticatedUser(context);

        // Check if currency is being changed and if account has transactions
        if (validatedInput.currency) {
          const currentAccount = await context.accountRepository.findById(
            id,
            user.id,
          );
          if (!currentAccount) {
            throw new GraphQLError("Account not found", {
              extensions: { code: "NOT_FOUND" },
            });
          }

          // If currency is being changed, check for existing transactions
          if (currentAccount.currency !== validatedInput.currency) {
            const hasTransactions =
              await context.transactionRepository.hasTransactionsForAccount(
                id,
                user.id,
              );

            if (hasTransactions) {
              throw new GraphQLError(
                "Cannot change currency for account that has existing transactions. Please create a new account with the desired currency instead.",
                {
                  extensions: {
                    code: "CURRENCY_CHANGE_BLOCKED",
                    accountId: id,
                    currentCurrency: currentAccount.currency,
                    requestedCurrency: validatedInput.currency,
                  },
                },
              );
            }
          }
        }

        const account = await context.accountRepository.update(
          id,
          user.id,
          validatedInput,
        );
        return account;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.errors[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        handleResolverError(error, "Failed to update account");
      }
    },
    archiveAccount: async (
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
        const account = await context.accountRepository.archive(id, user.id);
        return account;
      } catch (error) {
        handleResolverError(error, "Failed to archive account");
      }
    },
  },
};
