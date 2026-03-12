import { readFileSync } from "fs";
import { join } from "path";
import { ApolloServer } from "@apollo/server";
import DataLoader from "dataloader";
import { ReActAgent } from "./agents/react-agent";
import { AuthContext, JwtAuthService } from "./auth/jwt-auth";
import { createAccountLoader } from "./dataloaders/account-loader";
import { createCategoryLoader } from "./dataloaders/category-loader";
import { AccountRepository } from "./repositories/account-repository";
import { CategoryRepository } from "./repositories/category-repository";
import { TransactionRepository } from "./repositories/transaction-repository";
import { UserRepository } from "./repositories/user-repository";
import { resolvers } from "./resolvers";
import { getAuthenticatedUser } from "./resolvers/shared";
import { AccountService } from "./services/account-service";
import { AgentDataService } from "./services/agent-data-service";
import { CategoryService } from "./services/category-service";
import { CreateTransactionFromTextService } from "./services/create-transaction-from-text-service";
import { InsightService } from "./services/insight-service";
import { MonthlyByCategoryReportService } from "./services/monthly-by-category-report-service";
import { IAccountRepository } from "./services/ports/account-repository";
import { ICategoryRepository } from "./services/ports/category-repository";
import { ITransactionRepository } from "./services/ports/transaction-repository";
import { IUserRepository } from "./services/ports/user-repository";
import { TransactionService } from "./services/transaction-service";
import { TransferService } from "./services/transfer-service";
import type {
  TransactionEmbeddedAccount,
  TransactionEmbeddedCategory,
} from "./types/graphql";
import { createBedrockChatModel } from "./utils/bedrock";

export interface GraphQLContext {
  auth: AuthContext;
  userRepository: IUserRepository;
  accountRepository: IAccountRepository;
  categoryRepository: ICategoryRepository;
  transactionRepository: ITransactionRepository;
  categoryService: CategoryService;
  transactionService: TransactionService;
  accountService: AccountService;
  insightService: InsightService;
  createTransactionFromTextService: CreateTransactionFromTextService;
  transferService: TransferService;
  monthlyByCategoryReportService: MonthlyByCategoryReportService;
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
let categoryService: CategoryService;
let transactionService: TransactionService;
let accountService: AccountService;
let insightService: InsightService;
let createTransactionFromTextService: CreateTransactionFromTextService;
let transferService: TransferService;
let monthlyByCategoryReportService: MonthlyByCategoryReportService;

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

  if (!categoryService) {
    categoryService = new CategoryService(categoryRepository);
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

  if (!insightService) {
    const agent = new ReActAgent(createBedrockChatModel());
    const agentDataService = new AgentDataService(
      accountRepository,
      categoryRepository,
      transactionRepository,
    );

    insightService = new InsightService(agentDataService, agent);
  }

  if (!createTransactionFromTextService) {
    const agent = new ReActAgent(createBedrockChatModel());
    const agentDataService = new AgentDataService(
      accountRepository,
      categoryRepository,
      transactionRepository,
    );
    createTransactionFromTextService = new CreateTransactionFromTextService({
      agent,
      agentDataService,
      transactionService,
    });
  }

  if (!transferService) {
    transferService = new TransferService(
      transactionRepository,
      accountRepository,
    );
  }

  if (!monthlyByCategoryReportService) {
    monthlyByCategoryReportService = new MonthlyByCategoryReportService(
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
    categoryService,
    transactionService,
    accountService,
    insightService,
    createTransactionFromTextService,
    transferService,
    monthlyByCategoryReportService,
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
