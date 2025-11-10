import { readFileSync } from "fs";
import { join } from "path";
import { ApolloServer } from "@apollo/server";
import DataLoader from "dataloader";
import { JwtAuthService, AuthContext } from "./auth/jwtAuth";
import { createAccountLoader } from "./dataloaders/accountLoader";
import { createCategoryLoader } from "./dataloaders/categoryLoader";
import { IAccountRepository } from "./models/Account";
import { ICategoryRepository } from "./models/Category";
import { ITransactionRepository } from "./models/Transaction";
import { IUserRepository } from "./models/User";
import { AccountRepository } from "./repositories/AccountRepository";
import { CategoryRepository } from "./repositories/CategoryRepository";
import { TransactionRepository } from "./repositories/TransactionRepository";
import { UserRepository } from "./repositories/UserRepository";
import { resolvers } from "./resolvers";
import { getAuthenticatedUser } from "./resolvers/shared";
import { AccountService } from "./services/AccountService";
import { ReportsService } from "./services/ReportsService";
import { TransactionService } from "./services/TransactionService";
import { TransferService } from "./services/TransferService";
import type {
  TransactionEmbeddedAccount,
  TransactionEmbeddedCategory,
} from "./types/graphql";

export interface GraphQLContext {
  auth: AuthContext;
  userRepository: IUserRepository;
  accountRepository: IAccountRepository;
  categoryRepository: ICategoryRepository;
  transactionRepository: ITransactionRepository;
  transactionService: TransactionService;
  accountService: AccountService;
  transferService: TransferService;
  reportsService: ReportsService;
  jwtAuthService: JwtAuthService;
  authHeader?: string;
  accountLoader: DataLoader<string, TransactionEmbeddedAccount>;
  categoryLoader: DataLoader<string, TransactionEmbeddedCategory>;
}

let jwtAuthService: JwtAuthService;
let userRepository: UserRepository;
let accountRepository: AccountRepository;
let categoryRepository: CategoryRepository;
let transactionRepository: TransactionRepository;
let transactionService: TransactionService;
let accountService: AccountService;
let transferService: TransferService;
let reportsService: ReportsService;

const typeDefs = readFileSync(join(__dirname, "schema.graphql"), {
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
  // Initialize services on first use (after env vars are loaded)
  if (!jwtAuthService) {
    jwtAuthService = new JwtAuthService();
  }

  if (!userRepository) {
    userRepository = new UserRepository();
  }

  if (!accountRepository) {
    accountRepository = new AccountRepository();
  }

  if (!categoryRepository) {
    categoryRepository = new CategoryRepository();
  }

  if (!transactionRepository) {
    transactionRepository = new TransactionRepository();
  }

  if (!transactionService) {
    transactionService = new TransactionService(
      accountRepository,
      categoryRepository,
      transactionRepository,
    );
  }

  if (!accountService) {
    accountService = new AccountService(
      accountRepository,
      transactionRepository,
    );
  }

  if (!transferService) {
    transferService = new TransferService(
      transactionRepository,
      accountRepository,
    );
  }

  if (!reportsService) {
    reportsService = new ReportsService(
      transactionRepository,
      categoryRepository,
    );
  }

  const authHeader = req.headers.authorization;
  // Handle both string and string[] types from different contexts
  const authHeaderString = Array.isArray(authHeader)
    ? authHeader[0]
    : authHeader;

  const auth = await jwtAuthService.getAuthContext(authHeaderString);

  // Build the context first
  const contextWithoutLoaders: Omit<
    GraphQLContext,
    "accountLoader" | "categoryLoader"
  > = {
    auth,
    userRepository,
    accountRepository,
    categoryRepository,
    transactionRepository,
    transactionService,
    accountService,
    transferService,
    reportsService,
    jwtAuthService,
    authHeader: authHeaderString,
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
  const accountLoader = createAccountLoader(accountRepository, getUserId);
  const categoryLoader = createCategoryLoader(categoryRepository, getUserId);

  return {
    ...contextWithoutLoaders,
    accountLoader,
    categoryLoader,
  };
}
