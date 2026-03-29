import { ReActAgent } from "./agents/react-agent";
import { JwtAuthService } from "./auth/jwt-auth";
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
import { createSingleton } from "./utils/dependency-injection";
import { requireEnv } from "./utils/require-env";

// Auth
export const resolveJwtAuthService = createSingleton(
  () => new JwtAuthService(),
);

// Repositories
export const resolveAccountRepository = createSingleton<AccountRepository>(
  () => new DynAccountRepository(),
);
export const resolveCategoryRepository = createSingleton<CategoryRepository>(
  () => new DynCategoryRepository(),
);
export const resolveTransactionRepository =
  createSingleton<TransactionRepository>(() => new DynTransactionRepository());
export const resolveUserRepository = createSingleton<UserRepository>(
  () => new DynUserRepository(),
);

// CRUD services
export const resolveAccountService = createSingleton(
  () =>
    new AccountService(
      resolveAccountRepository(),
      resolveTransactionRepository(),
    ),
);
export const resolveCategoryService = createSingleton(
  () => new CategoryService(resolveCategoryRepository()),
);
export const resolveTransactionService = createSingleton(
  () =>
    new TransactionService(
      resolveAccountRepository(),
      resolveCategoryRepository(),
      resolveTransactionRepository(),
    ),
);
export const resolveTransferService = createSingleton(
  () =>
    new TransferService(
      resolveTransactionRepository(),
      resolveAccountRepository(),
    ),
);
export const resolveUserService = createSingleton(
  () => new UserService(resolveUserRepository()),
);

// Report services
export const resolveByCategoryReportService = createSingleton(
  () =>
    new ByCategoryReportService(
      resolveTransactionRepository(),
      resolveCategoryRepository(),
    ),
);

// AI infrastructure
const resolveBedrockChatModel = createSingleton(() => createBedrockChatModel());

// AI services
export const resolveCreateTransactionFromTextService = createSingleton(
  () =>
    new CreateTransactionFromTextService({
      accountRepository: resolveAccountRepository(),
      categoryRepository: resolveCategoryRepository(),
      transactionRepository: resolveTransactionRepository(),
      agent: new ReActAgent(resolveBedrockChatModel()),
      transactionService: resolveTransactionService(),
    }),
);
export const resolveInsightService = createSingleton(
  () =>
    new InsightService({
      accountRepository: resolveAccountRepository(),
      categoryRepository: resolveCategoryRepository(),
      transactionRepository: resolveTransactionRepository(),
      agent: new ReActAgent(resolveBedrockChatModel()),
    }),
);

// Telegram services
export const resolveTelegramBotService = createSingleton(
  () =>
    new TelegramBotService({
      telegramBotRepository: new DynTelegramBotRepository(),
      telegramApiClient: new HttpTelegramApiClient(),
      backgroundJobDispatcher: process.env.BACKGROUND_JOB_FUNCTION_NAME
        ? new LambdaBackgroundJobDispatcher()
        : { dispatch: async (job: unknown) => console.log("[dev] background job skipped:", job) },
      webhookBaseUrl: requireEnv("WEBHOOK_BASE_URL"),
    }),
);
