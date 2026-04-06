import DataLoader from "dataloader";
import { AuthContext, JwtAuthService } from "../auth/jwt-auth";
import { AccountService } from "../services/account-service";
import { CreateTransactionFromTextService } from "../services/agent-services/create-transaction-from-text-service";
import { InsightChatService } from "../services/agent-services/insight-chat-service";
import { ByCategoryReportService } from "../services/by-category-report-service";
import { CategoryService } from "../services/category-service";
import { UserRepository } from "../services/ports/user-repository";
import { TelegramBotService } from "../services/telegram-bot-service";
import { TransactionService } from "../services/transaction-service";
import { TransferService } from "../services/transfer-service";
import { UserService } from "../services/user-service";
import {
  TransactionEmbeddedAccount,
  TransactionEmbeddedCategory,
} from "./embedded-types";

export interface GraphQLContext {
  auth: AuthContext;
  userRepository: UserRepository;
  userService: UserService;
  categoryService: CategoryService;
  transactionService: TransactionService;
  accountService: AccountService;
  insightChatService: InsightChatService;
  createTransactionFromTextService: CreateTransactionFromTextService;
  transferService: TransferService;
  byCategoryReportService: ByCategoryReportService;
  telegramBotService: TelegramBotService;
  jwtAuthService: JwtAuthService;
  authHeader?: string;
  accountLoader: DataLoader<string, TransactionEmbeddedAccount>;
  categoryLoader: DataLoader<string, TransactionEmbeddedCategory>;
}
