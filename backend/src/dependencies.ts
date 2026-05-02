import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import * as aws from "@langchain/aws";
import { initChatModel } from "langchain";
import { registerProviderForBundling } from "langchain/chat_models/universal";

registerProviderForBundling("bedrock", aws);
import { JwtAuthService } from "./auth/jwt-auth";
import { createAssistantAgent } from "./langchain/agents/assistant-agent";
import { createCreateTransactionAgent } from "./langchain/agents/create-transaction-agent";
import { LangChainAgent } from "./langchain/langchain-agent";
import {
  DEFAULT_LANGCHAIN_MAX_TOKENS,
  DEFAULT_LANGCHAIN_MODEL_ID,
  DEFAULT_LANGCHAIN_TEMPERATURE,
  DEFAULT_LANGCHAIN_TIMEOUT,
} from "./langchain/settings";
import {
  DEFAULT_CHAT_HISTORY_MAX_MESSAGES,
  DEFAULT_CHAT_MESSAGE_TTL_SECONDS,
} from "./models/chat-message";
import { HttpTelegramApiClient } from "./providers/http-telegram-api-client";
import { LambdaBackgroundJobDispatcher } from "./providers/lambda-background-job-dispatcher";
import { DynAccountRepository } from "./repositories/dyn-account-repository";
import { DynAtomicWriter } from "./repositories/dyn-atomic-writer";
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
import {
  createAsyncSingleton,
  createSingleton,
} from "./utils/dependency-injection";
import { createDynamoDBClient } from "./utils/dynamo-client";
import {
  requireEnv,
  requireFloatEnv,
  requireIntEnv,
} from "./utils/require-env";

// Auth
export const resolveJwtAuthService = createSingleton(
  () => new JwtAuthService(),
);

// Repositories
const resolveDynDocumentClient = createSingleton(() =>
  DynamoDBDocumentClient.from(createDynamoDBClient()),
);

export const resolveAtomicWriter = createSingleton(
  () =>
    new DynAtomicWriter({
      accountsTableName: requireEnv("ACCOUNTS_TABLE_NAME"),
      transactionsTableName: requireEnv("TRANSACTIONS_TABLE_NAME"),
    }),
);
export const resolveAccountRepository = createSingleton(
  () =>
    new DynAccountRepository(
      requireEnv("ACCOUNTS_TABLE_NAME"),
      resolveDynDocumentClient(),
    ),
);
export const resolveCategoryRepository = createSingleton(
  () =>
    new DynCategoryRepository(
      requireEnv("CATEGORIES_TABLE_NAME"),
      resolveDynDocumentClient(),
    ),
);
export const resolveChatMessageRepository = createSingleton(
  () =>
    new DynChatMessageRepository({
      tableName: requireEnv("CHAT_MESSAGES_TABLE_NAME"),
      ttlSeconds: requireIntEnv(
        "CHAT_MESSAGE_TTL_SECONDS",
        DEFAULT_CHAT_MESSAGE_TTL_SECONDS,
      ),
      documentClient: resolveDynDocumentClient(),
    }),
);

const resolveTelegramBotRepository = createSingleton(
  () =>
    new DynTelegramBotRepository(
      requireEnv("TELEGRAM_BOTS_TABLE_NAME"),
      resolveDynDocumentClient(),
    ),
);
export const resolveTransactionRepository = createSingleton(
  () =>
    new DynTransactionRepository(
      requireEnv("TRANSACTIONS_TABLE_NAME"),
      resolveDynDocumentClient(),
    ),
);
export const resolveUserRepository = createSingleton(
  () =>
    new DynUserRepository(
      requireEnv("USERS_TABLE_NAME"),
      resolveDynDocumentClient(),
    ),
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
      atomicWriter: resolveAtomicWriter(),
    }),
);
export const resolveTransferService = createSingleton(
  () =>
    new TransferService({
      accountRepository: resolveAccountRepository(),
      transactionRepository: resolveTransactionRepository(),
      atomicWriter: resolveAtomicWriter(),
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
export const createChatModel = async () =>
  await initChatModel(
    requireEnv("LANGCHAIN_MODEL_ID", DEFAULT_LANGCHAIN_MODEL_ID),
    {
      maxTokens: requireIntEnv(
        "LANGCHAIN_MAX_TOKENS",
        DEFAULT_LANGCHAIN_MAX_TOKENS,
      ),
      temperature: requireFloatEnv(
        "LANGCHAIN_TEMPERATURE",
        DEFAULT_LANGCHAIN_TEMPERATURE,
      ),
      timeout: requireIntEnv("LANGCHAIN_TIMEOUT", DEFAULT_LANGCHAIN_TIMEOUT),
    },
  );

const resolveChatModel = createAsyncSingleton(() => createChatModel());

// AI agents
export const resolveAssistantAgent = createAsyncSingleton(
  async () =>
    new LangChainAgent(
      createAssistantAgent({
        model: await resolveChatModel(),
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
export const resolveCreateTransactionAgent = createAsyncSingleton(
  async () =>
    new LangChainAgent(
      createCreateTransactionAgent({
        model: await resolveChatModel(),
        accountRepository: resolveAccountRepository(),
        categoryRepository: resolveCategoryRepository(),
        transactionRepository: resolveTransactionRepository(),
        transactionService: resolveTransactionService(),
      }),
      "create-transaction-agent",
    ),
);

// AI services
export const resolveCreateTransactionFromTextService = createAsyncSingleton(
  async () =>
    new CreateTransactionFromTextService({
      createTransactionAgent: await resolveCreateTransactionAgent(),
      transactionService: resolveTransactionService(),
    }),
);
export const resolveAssistantService = createAsyncSingleton(
  async () => new AssistantServiceImpl(await resolveAssistantAgent()),
);
export const resolveAssistantChatService = createAsyncSingleton(
  async () =>
    new AssistantChatServiceImpl({
      chatMessageRepository: resolveChatMessageRepository(),
      assistantService: await resolveAssistantService(),
      maxMessages: requireIntEnv(
        "CHAT_HISTORY_MAX_MESSAGES",
        DEFAULT_CHAT_HISTORY_MAX_MESSAGES,
      ),
    }),
);

// Telegram
export const resolveProcessTelegramMessageService = createAsyncSingleton(
  async () =>
    new ProcessTelegramMessageService({
      assistantChatService: await resolveAssistantChatService(),
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
