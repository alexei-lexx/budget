import { JwtAuthService } from "./auth/jwt-auth";
import { createAssistantAgent } from "./langchain/agents/assistant-agent";
import { createCreateTransactionAgent } from "./langchain/agents/create-transaction-agent";
import { LangChainAgent } from "./langchain/langchain-agent";
import {
  DEFAULT_CHAT_HISTORY_MAX_MESSAGES,
  DEFAULT_CHAT_MESSAGE_TTL_SECONDS,
} from "./models/chat-message";
import { HttpTelegramApiClient } from "./providers/http-telegram-api-client";
import { LambdaBackgroundJobDispatcher } from "./providers/lambda-background-job-dispatcher";
import { DynAccountRepository } from "./repositories/dyn-account-repository";
import { DynCategoryRepository } from "./repositories/dyn-category-repository";
import { DynChatMessageRepository } from "./repositories/dyn-chat-message-repository";
import { DynTelegramBotRepository } from "./repositories/dyn-telegram-bot-repository";
import { DynTransactionRepository } from "./repositories/dyn-transaction-repository";
import { DynUserRepository } from "./repositories/dyn-user-repository";
import { AccountServiceImpl } from "./services/account-service";
import { AssistantChatServiceImpl } from "./services/assistant-chat-service";
import { AssistantServiceImpl } from "./services/assistant-service";
import { ByCategoryReportService } from "./services/by-category-report-service";
import { CategoryServiceImpl } from "./services/category-service";
import { CreateTransactionFromTextService } from "./services/create-transaction-from-text-service";
import { CurrencyServiceImpl } from "./services/currency-service";
import { ProcessTelegramMessageService } from "./services/process-telegram-message-service";
import { TelegramBotService } from "./services/telegram-bot-service";
import { TransactionServiceImpl } from "./services/transaction-service";
import { TransferService } from "./services/transfer-service";
import { UserService } from "./services/user-service";
import { createBedrockChatModel } from "./utils/bedrock";
import { createSingleton } from "./utils/dependency-injection";
import { requireEnv, requireIntEnv } from "./utils/require-env";

// Auth
export const resolveJwtAuthService = createSingleton(
  () => new JwtAuthService(),
);

// Repositories
export const resolveAccountRepository = createSingleton(
  () => new DynAccountRepository(requireEnv("ACCOUNTS_TABLE_NAME")),
);
export const resolveCategoryRepository = createSingleton(
  () => new DynCategoryRepository(requireEnv("CATEGORIES_TABLE_NAME")),
);
export const resolveChatMessageRepository = createSingleton(
  () =>
    new DynChatMessageRepository({
      tableName: requireEnv("CHAT_MESSAGES_TABLE_NAME"),
      ttlSeconds: requireIntEnv(
        "CHAT_MESSAGE_TTL_SECONDS",
        DEFAULT_CHAT_MESSAGE_TTL_SECONDS,
      ),
    }),
);

const resolveTelegramBotRepository = createSingleton(
  () => new DynTelegramBotRepository(requireEnv("TELEGRAM_BOTS_TABLE_NAME")),
);
export const resolveTransactionRepository = createSingleton(
  () => new DynTransactionRepository(requireEnv("TRANSACTIONS_TABLE_NAME")),
);
export const resolveUserRepository = createSingleton(
  () => new DynUserRepository(requireEnv("USERS_TABLE_NAME")),
);

// CRUD services
export const resolveAccountService = createSingleton(
  () =>
    new AccountServiceImpl(
      resolveAccountRepository(),
      resolveTransactionRepository(),
    ),
);
export const resolveCategoryService = createSingleton(
  () => new CategoryServiceImpl(resolveCategoryRepository()),
);
export const resolveCurrencyService = createSingleton(
  () => new CurrencyServiceImpl(resolveAccountRepository()),
);
export const resolveTransactionService = createSingleton(
  () =>
    new TransactionServiceImpl({
      accountRepository: resolveAccountRepository(),
      categoryRepository: resolveCategoryRepository(),
      transactionRepository: resolveTransactionRepository(),
    }),
);
export const resolveTransferService = createSingleton(
  () =>
    new TransferService({
      accountRepository: resolveAccountRepository(),
      transactionRepository: resolveTransactionRepository(),
    }),
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

// Providers
const resolveBackgroundJobDispatcher = createSingleton(() =>
  process.env.BACKGROUND_JOB_FUNCTION_NAME
    ? new LambdaBackgroundJobDispatcher()
    : {
        dispatch: async (job: unknown) =>
          console.log("[dev] background job skipped:", job),
      },
);
const resolveTelegramApiClient = createSingleton(
  () => new HttpTelegramApiClient(),
);

// AI infrastructure
const resolveBedrockChatModel = createSingleton(() => createBedrockChatModel());

// AI agents
export const resolveAssistantAgent = createSingleton(
  () =>
    new LangChainAgent(
      createAssistantAgent({
        model: resolveBedrockChatModel(),
        accountRepository: resolveAccountRepository(),
        accountService: resolveAccountService(),
        categoryRepository: resolveCategoryRepository(),
        categoryService: resolveCategoryService(),
        transactionRepository: resolveTransactionRepository(),
        transactionService: resolveTransactionService(),
      }),
      "assistant-agent",
    ),
);
export const resolveCreateTransactionAgent = createSingleton(
  () =>
    new LangChainAgent(
      createCreateTransactionAgent({
        model: resolveBedrockChatModel(),
        accountRepository: resolveAccountRepository(),
        categoryRepository: resolveCategoryRepository(),
        transactionRepository: resolveTransactionRepository(),
        transactionService: resolveTransactionService(),
      }),
      "create-transaction-agent",
    ),
);

// AI services
export const resolveCreateTransactionFromTextService = createSingleton(
  () =>
    new CreateTransactionFromTextService({
      createTransactionAgent: resolveCreateTransactionAgent(),
      transactionService: resolveTransactionService(),
    }),
);
export const resolveAssistantService = createSingleton(
  () => new AssistantServiceImpl(resolveAssistantAgent()),
);
export const resolveAssistantChatService = createSingleton(
  () =>
    new AssistantChatServiceImpl({
      chatMessageRepository: resolveChatMessageRepository(),
      assistantService: resolveAssistantService(),
      maxMessages: requireIntEnv(
        "CHAT_HISTORY_MAX_MESSAGES",
        DEFAULT_CHAT_HISTORY_MAX_MESSAGES,
      ),
    }),
);

// Telegram
export const resolveProcessTelegramMessageService = createSingleton(
  () =>
    new ProcessTelegramMessageService({
      assistantChatService: resolveAssistantChatService(),
      telegramApiClient: resolveTelegramApiClient(),
      telegramBotRepository: resolveTelegramBotRepository(),
    }),
);
export const resolveTelegramBotService = createSingleton(
  () =>
    new TelegramBotService({
      backgroundJobDispatcher: resolveBackgroundJobDispatcher(),
      telegramApiClient: resolveTelegramApiClient(),
      telegramBotRepository: resolveTelegramBotRepository(),
      webhookBaseUrl: requireEnv("WEBHOOK_BASE_URL"),
    }),
);
