import DataLoader from "dataloader";
import { AuthContext, JwtAuthService } from "../auth/jwt-auth";
import { AccountService } from "../services/account-service";
import { CreateTransactionFromTextService } from "../services/agent-services/create-transaction-from-text-service";
import { InsightService } from "../services/agent-services/insight-service";
import { ByCategoryReportService } from "../services/by-category-report-service";
import { CategoryService } from "../services/category-service";
import { UserRepository } from "../services/ports/user-repository";
import { TelegramBotService } from "../services/telegram-bot-service";
import { TransactionService } from "../services/transaction-service-fakes";
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
  insightService: InsightService;
  createTransactionFromTextService: CreateTransactionFromTextService;
  transferService: TransferService;
  byCategoryReportService: ByCategoryReportService;
  telegramBotService: TelegramBotService;
  jwtAuthService: JwtAuthService;
  authHeader?: string;
  accountLoader: DataLoader<string, TransactionEmbeddedAccount>;
  categoryLoader: DataLoader<string, TransactionEmbeddedCategory>;
}
