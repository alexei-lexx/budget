import { BusinessError, BusinessErrorCodes } from "./BusinessError.js";
import {
  ITransactionRepository,
  Transaction,
  CreateTransactionInput,
} from "../models/Transaction.js";
import { IAccountRepository, Account } from "../models/Account.js";
import { ICategoryRepository, Category } from "../models/Category.js";

/**
 * Transaction service class for handling business logic and validation
 * Implements the service layer pattern for transaction operations
 */
export class TransactionService {
  constructor(
    private accountRepository: IAccountRepository,
    private categoryRepository: ICategoryRepository,
    private transactionRepository: ITransactionRepository,
  ) {}

  /**
   * Validate that an account exists and belongs to the user
   * @param accountId - The account ID to validate
   * @param userId - The user ID to check ownership
   * @returns Promise<Account> - The validated account
   * @throws BusinessError if account not found or doesn't belong to user
   */
  private async validateAccount(
    accountId: string,
    userId: string,
  ): Promise<Account> {
    const account = await this.accountRepository.findById(accountId, userId);

    if (!account) {
      throw new BusinessError(
        "Account not found or doesn't belong to user",
        BusinessErrorCodes.ACCOUNT_NOT_FOUND,
        { accountId, userId },
      );
    }

    return account;
  }

  /**
   * Validate that a category exists, belongs to the user, and matches the transaction type
   * @param categoryId - The category ID to validate (optional)
   * @param userId - The user ID to check ownership
   * @param transactionType - The transaction type to match against category type
   * @returns Promise<Category | null> - The validated category or null if not provided
   * @throws BusinessError if category not found, doesn't belong to user, or type mismatch
   */
  private async validateCategory(
    categoryId: string | undefined,
    userId: string,
    transactionType: "INCOME" | "EXPENSE",
  ): Promise<Category | null> {
    if (!categoryId) {
      return null;
    }

    const category = await this.categoryRepository.findById(categoryId, userId);

    if (!category) {
      throw new BusinessError(
        "Category not found or doesn't belong to user",
        BusinessErrorCodes.CATEGORY_NOT_FOUND,
        { categoryId, userId },
      );
    }

    if (category.type !== transactionType) {
      throw new BusinessError(
        `Category type "${category.type}" doesn't match transaction type "${transactionType}"`,
        BusinessErrorCodes.INVALID_CATEGORY_TYPE,
        {
          categoryType: category.type,
          transactionType,
          categoryId,
          categoryName: category.name,
        },
      );
    }

    return category;
  }

  /**
   * Validate that the transaction currency matches the account currency
   * @param transactionCurrency - The currency from the transaction
   * @param account - The account to validate against
   * @throws BusinessError if currencies don't match
   */
  private validateCurrencyMatch(
    transactionCurrency: string,
    account: Account,
  ): void {
    if (transactionCurrency !== account.currency) {
      throw new BusinessError(
        `Transaction currency "${transactionCurrency}" doesn't match account currency "${account.currency}"`,
        BusinessErrorCodes.CURRENCY_MISMATCH,
        {
          transactionCurrency,
          accountCurrency: account.currency,
          accountId: account.id,
          accountName: account.name,
        },
      );
    }
  }

  /**
   * Create a new transaction with full business validation
   * @param input - Transaction creation input (without userId, which will be added)
   * @param userId - The user ID creating the transaction
   * @returns Promise<Transaction> - The created transaction
   * @throws BusinessError for any business rule violations
   */
  async createTransaction(
    input: Omit<CreateTransactionInput, "userId">,
    userId: string,
  ): Promise<Transaction> {
    // Validate business rules
    const account = await this.validateAccount(input.accountId, userId);
    await this.validateCategory(input.categoryId, userId, input.type);
    this.validateCurrencyMatch(input.currency, account);

    // Additional input validation
    if (input.amount < 0) {
      throw new BusinessError(
        "Transaction amount cannot be negative",
        BusinessErrorCodes.INVALID_AMOUNT,
        { amount: input.amount },
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.date)) {
      throw new BusinessError(
        "Transaction date must be in YYYY-MM-DD format",
        BusinessErrorCodes.INVALID_DATE,
        { date: input.date },
      );
    }

    // Create the transaction through repository
    const createInput: CreateTransactionInput = {
      ...input,
      userId,
    };

    return await this.transactionRepository.create(createInput);
  }

  /**
   * Get all active transactions for a user, sorted by date (newest first)
   * @param userId - The user ID to get transactions for
   * @returns Promise<Transaction[]> - Array of user's active transactions
   */
  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    return await this.transactionRepository.findActiveByUserId(userId);
  }
}
