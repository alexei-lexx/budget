import { readFileSync } from "fs";
import { join } from "path";
import { ApolloServer } from "@apollo/server";
import {
  resolveAccountRepository,
  resolveAccountService,
  resolveByCategoryReportService,
  resolveCategoryRepository,
  resolveCategoryService,
  resolveCreateTransactionFromTextService,
  resolveInsightService,
  resolveJwtAuthService,
  resolveTelegramBotService,
  resolveTransactionService,
  resolveTransferService,
  resolveUserRepository,
  resolveUserService,
} from "./dependencies";
import { GraphQLContext } from "./graphql/context";
import { createAccountLoader } from "./graphql/dataloaders/account-loader";
import { createCategoryLoader } from "./graphql/dataloaders/category-loader";
import { resolvers } from "./graphql/resolvers";
import { getAuthenticatedUser } from "./graphql/resolvers/shared";

const typeDefs = readFileSync(join(__dirname, "graphql/schema.graphql"), {
  encoding: "utf-8",
});

export const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV === "development", // Enable introspection for development
});

/**
 * Create GraphQL context with JWT authentication
 * Extracts and verifies JWT token from Authorization header
 */
export async function createContext(req: {
  headers: Record<string, string | string[] | undefined>;
}): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization;
  // Handle both string and string[] types from different contexts
  const authHeaderString = Array.isArray(authHeader)
    ? authHeader[0]
    : authHeader;

  const auth = await resolveJwtAuthService().getAuthContext(authHeaderString);

  // Build the context first
  const contextWithoutLoaders: Omit<
    GraphQLContext,
    "accountLoader" | "categoryLoader"
  > = {
    // Auth
    auth,
    authHeader: authHeaderString,
    jwtAuthService: resolveJwtAuthService(),

    // Repositories
    userRepository: resolveUserRepository(),

    // CRUD services
    accountService: resolveAccountService(),
    categoryService: resolveCategoryService(),
    transactionService: resolveTransactionService(),
    transferService: resolveTransferService(),
    userService: resolveUserService(),

    // Report services
    byCategoryReportService: resolveByCategoryReportService(),

    // AI services
    createTransactionFromTextService: resolveCreateTransactionFromTextService(),
    insightService: resolveInsightService(),

    // Telegram services
    telegramBotService: resolveTelegramBotService(),
  };

  // Create a function that gets the authenticated internal user ID (lazy evaluation)
  // This is needed because getAuthenticatedUser needs the full context
  const getUserId = async (): Promise<string> => {
    if (!auth.isAuthenticated) {
      return "";
    }
    try {
      const user = await getAuthenticatedUser(
        contextWithoutLoaders as GraphQLContext,
      );
      return user.id;
    } catch {
      return "";
    }
  };

  // Create fresh DataLoaders for this request with lazy user ID resolution
  // Each loader is scoped per-request with proper internal user ID for authorization
  const accountLoader = createAccountLoader(
    resolveAccountRepository(),
    getUserId,
  );
  const categoryLoader = createCategoryLoader(
    resolveCategoryRepository(),
    getUserId,
  );

  return {
    ...contextWithoutLoaders,
    accountLoader,
    categoryLoader,
  };
}
