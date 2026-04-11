import { JwtAuthService } from "./auth/jwt-auth";
import { createInsightAgent } from "./langchain/agents/insight-agent";
import { HttpTelegramApiClient } from "./providers/http-telegram-api-client";
import { LambdaBackgroundJobDispatcher } from "./providers/lambda-background-job-dispatcher";
import { ReActAgent } from "./providers/react-agent";
import { DynAccountRepository } from "./repositories/dyn-account-repository";
import { DynCategoryRepository } from "./repositories/dyn-category-repository";
import { DynChatMessageRepository } from "./repositories/dyn-chat-message-repository";
import { DynTelegramBotRepository } from "./repositories/dyn-telegram-bot-repository";
import { DynTransactionRepository } from "./repositories/dyn-transaction-repository";
import { DynUserRepository } from "./repositories/dyn-user-repository";
import { AccountService } from "./services/account-service";
import { AssistantChatServiceImpl } from "./services/agent-services/assistant-chat-service";
import { CreateTransactionFromTextService } from "./services/agent-services/create-transaction-from-text-service";
import { InsightServiceImpl } from "./services/agent-services/insight-service";
import { ByCategoryReportService } from "./services/by-category-report-service";
import { CategoryService } from "./services/category-service";
import { ProcessTelegramMessageService } from "./services/process-telegram-message-service";
import { TelegramBotService } from "./services/telegram-bot-service";
import { TransactionService } from "./services/transaction-service";
import { TransferService } from "./services/transfer-service";
import { UserService } from "./services/user-service";
import { createBedrockChatModel } from "./utils/bedrock";
import { createSingleton } from "./utils/dependency-injection";
import { requireEnv, requireIntEnv } from "./utils/require-env";

const chatHistoryMaxMessages = requireIntEnv("CHAT_HISTORY_MAX_MESSAGES");

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
      ttlSeconds: requireIntEnv("CHAT_MESSAGE_TTL_SECONDS"),
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
export const resolveInsightAgent = createSingleton(() =>
  createInsightAgent({
    model: resolveBedrockChatModel(),
    accountRepository: resolveAccountRepository(),
    categoryRepository: resolveCategoryRepository(),
    transactionRepository: resolveTransactionRepository(),
  }),
);

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
    new InsightServiceImpl({
      accountRepository: resolveAccountRepository(),
      categoryRepository: resolveCategoryRepository(),
      transactionRepository: resolveTransactionRepository(),
      insightAgent: resolveInsightAgent(),
    }),
);
export const resolveAssistantChatService = createSingleton(
  () =>
    new AssistantChatServiceImpl({
      chatMessageRepository: resolveChatMessageRepository(),
      insightService: resolveInsightService(),
      maxMessages: chatHistoryMaxMessages,
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
