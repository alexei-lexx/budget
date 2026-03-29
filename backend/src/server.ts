import { readFileSync } from "fs";
import { join } from "path";
import { ApolloServer } from "@apollo/server";
import { ReActAgent } from "./agents/react-agent";
import { JwtAuthService } from "./auth/jwt-auth";
import { GraphQLContext } from "./graphql/context";
import { createAccountLoader } from "./graphql/dataloaders/account-loader";
import { createCategoryLoader } from "./graphql/dataloaders/category-loader";
import { resolvers } from "./graphql/resolvers";
import { getAuthenticatedUser } from "./graphql/resolvers/shared";
import { HttpTelegramApiClient } from "./providers/http-telegram-api-client";
import { LambdaBackgroundJobDispatcher } from "./providers/lambda-background-job-dispatcher";
import { DynAccountRepository } from "./repositories/dyn-account-repository";
import { DynCategoryRepository } from "./repositories/dyn-category-repository";
import { DynTelegramBotRepository } from "./repositories/dyn-telegram-bot-repository";
import { DynTransactionRepository } from "./repositories/dyn-transaction-repository";
import { DynUserRepository } from "./repositories/dyn-user-repository";
import { AccountService } from "./services/account-service";
import { ByCategoryReportService } from "./services/by-category-report-service";
import { CategoryService } from "./services/category-service";
import { CreateTransactionFromTextService } from "./services/create-transaction-from-text-service";
import { InsightService } from "./services/insight-service";
import { AccountRepository } from "./services/ports/account-repository";
import { CategoryRepository } from "./services/ports/category-repository";
import { TransactionRepository } from "./services/ports/transaction-repository";
import { UserRepository } from "./services/ports/user-repository";
import { TelegramBotService } from "./services/telegram-bot-service";
import { TransactionService } from "./services/transaction-service";
import { TransferService } from "./services/transfer-service";
import { UserService } from "./services/user-service";
import { createBedrockChatModel } from "./utils/bedrock";
import { requireEnv } from "./utils/require-env";

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
let byCategoryReportService: ByCategoryReportService;
let telegramBotService: TelegramBotService;
let userService: UserService;

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
  // Initialize services on first use (after env vars are loaded)
  if (!jwtAuthService) {
    jwtAuthService = new JwtAuthService();
  }

  if (!userRepository) {
    userRepository = new DynUserRepository();
  }

  if (!accountRepository) {
    accountRepository = new DynAccountRepository();
  }

  if (!categoryRepository) {
    categoryRepository = new DynCategoryRepository();
  }

  if (!transactionRepository) {
    transactionRepository = new DynTransactionRepository();
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
    insightService = new InsightService({
      accountRepository,
      categoryRepository,
      transactionRepository,
      agent,
    });
  }

  if (!createTransactionFromTextService) {
    const agent = new ReActAgent(createBedrockChatModel());
    createTransactionFromTextService = new CreateTransactionFromTextService({
      accountRepository,
      categoryRepository,
      transactionRepository,
      agent,
      transactionService,
    });
  }

  if (!transferService) {
    transferService = new TransferService(
      transactionRepository,
      accountRepository,
    );
  }

  if (!byCategoryReportService) {
    byCategoryReportService = new ByCategoryReportService(
      transactionRepository,
      categoryRepository,
    );
  }

  if (!telegramBotService) {
    const telegramBotRepository = new DynTelegramBotRepository();
    const telegramApiClient = new HttpTelegramApiClient();
    const backgroundJobDispatcher = process.env.BACKGROUND_JOB_FUNCTION_NAME
      ? new LambdaBackgroundJobDispatcher()
      : {
          dispatch: async (job: unknown) =>
            console.log("[dev] background job skipped:", job),
        };

    const webhookBaseUrl = requireEnv("WEBHOOK_BASE_URL");

    telegramBotService = new TelegramBotService({
      telegramBotRepository,
      telegramApiClient,
      backgroundJobDispatcher,
      webhookBaseUrl,
    });
  }

  if (!userService) {
    userService = new UserService(userRepository);
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
    userService,
    categoryService,
    transactionService,
    accountService,
    insightService,
    createTransactionFromTextService,
    transferService,
    byCategoryReportService,
    telegramBotService,
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
