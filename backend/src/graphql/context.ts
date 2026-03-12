import DataLoader from "dataloader";
import { AuthContext, JwtAuthService } from "../auth/jwt-auth";
import { AccountService } from "../services/account-service";
import { CategoryService } from "../services/category-service";
import { CreateTransactionFromTextService } from "../services/create-transaction-from-text-service";
import { InsightService } from "../services/insight-service";
import { MonthlyByCategoryReportService } from "../services/monthly-by-category-report-service";
import { IAccountRepository } from "../services/ports/account-repository";
import { ICategoryRepository } from "../services/ports/category-repository";
import { ITransactionRepository } from "../services/ports/transaction-repository";
import { IUserRepository } from "../services/ports/user-repository";
import { TransactionService } from "../services/transaction-service";
import { TransferService } from "../services/transfer-service";
import {
  TransactionEmbeddedAccount,
  TransactionEmbeddedCategory,
} from "./embedded-types";

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
