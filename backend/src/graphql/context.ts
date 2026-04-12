import DataLoader from "dataloader";
import { AuthContext, JwtAuthService } from "../auth/jwt-auth";
import { UserRepository } from "../ports/user-repository";
import { AccountService } from "../services/account-service";
import { AssistantChatService } from "../services/assistant-chat-service";
import { ByCategoryReportService } from "../services/by-category-report-service";
import { CategoryService } from "../services/category-service";
import { CreateTransactionFromTextService } from "../services/create-transaction-from-text-service";
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
  assistantChatService: AssistantChatService;
  createTransactionFromTextService: CreateTransactionFromTextService;
  transferService: TransferService;
  byCategoryReportService: ByCategoryReportService;
  telegramBotService: TelegramBotService;
  jwtAuthService: JwtAuthService;
  authHeader?: string;
  accountLoader: DataLoader<string, TransactionEmbeddedAccount>;
  categoryLoader: DataLoader<string, TransactionEmbeddedCategory>;
}
