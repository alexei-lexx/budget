import { GraphQLError } from "graphql";
import { z } from "zod";
import { GraphQLContext } from "./server";
import { AccountRepositoryError } from "./repositories/AccountRepository";
import { User } from "./models/User";

/**
 * Supported currency codes
 */
const SUPPORTED_CURRENCIES = new Set(["USD", "EUR"]);

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

/**
 * Helper function to check authentication and return auth user
 */
function requireAuthentication(context: GraphQLContext) {
  if (!context.auth.isAuthenticated || !context.auth.user) {
    throw new GraphQLError("Authentication required", {
      extensions: {
        code: "UNAUTHENTICATED",
      },
    });
  }
  return context.auth.user;
}

/**
 * Helper function to get authenticated user from context
 * Handles authentication check and user lookup
 */
async function getAuthenticatedUser(context: GraphQLContext): Promise<User> {
  const authUser = requireAuthentication(context);

  try {
    // Get existing user from database
    const user = await context.userRepository.findByAuth0UserId(
      authUser.auth0UserId,
    );

    if (!user) {
      throw new GraphQLError("User not found", {
        extensions: {
          code: "USER_NOT_FOUND",
        },
      });
    }

    return user;
  } catch (error) {
    console.error("Error getting user:", error);
    if (error instanceof GraphQLError) {
      throw error;
    }
    throw new GraphQLError("Failed to authenticate user", {
      extensions: {
        code: "AUTHENTICATION_ERROR",
      },
    });
  }
}

/**
 * Helper function for ensureUser mutation that creates user if needed
 */
async function ensureAuthenticatedUser(context: GraphQLContext): Promise<User> {
  const authUser = requireAuthentication(context);

  try {
    // Ensure user exists in our database
    const user = await context.userRepository.ensureUser(
      authUser.auth0UserId,
      authUser.email || "",
    );
    return user;
  } catch (error) {
    console.error("Error ensuring user:", error);
    throw new GraphQLError("Failed to authenticate user", {
      extensions: {
        code: "AUTHENTICATION_ERROR",
      },
    });
  }
}

/**
 * Helper function to handle AccountRepositoryError and other errors
 */
function handleResolverError(error: unknown, defaultMessage: string): never {
  console.error(`Resolver error: ${defaultMessage}`, error);

  if (error instanceof AccountRepositoryError) {
    throw new GraphQLError(error.message, {
      extensions: {
        code: error.code,
      },
    });
  }

  throw new GraphQLError(defaultMessage, {
    extensions: {
      code: "INTERNAL_SERVER_ERROR",
    },
  });
}

export const resolvers = {
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
    ensureUser: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      try {
        const user = await ensureAuthenticatedUser(context);
        return user;
      } catch (error) {
        handleResolverError(error, "Failed to create or retrieve user");
      }
    },
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
