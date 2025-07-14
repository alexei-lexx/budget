import { BusinessError, BusinessErrorCodes } from "./BusinessError";
import {
  ITransactionRepository,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionConnection,
  TransactionType,
} from "../models/Transaction";
import { IAccountRepository, Account } from "../models/Account";
import {
  ICategoryRepository,
  Category,
  CategoryType,
} from "../models/Category";
import { PaginationInput } from "../types/pagination";

/**
 * Service layer input for creating transactions (currency automatically derived from account)
 */
type CreateTransactionServiceInput = Omit<
  CreateTransactionInput,
  "userId" | "currency"
>;

/**
 * Service layer input for updating transactions (currency automatically updated when account changes)
 */
type UpdateTransactionServiceInput = Omit<UpdateTransactionInput, "currency">;

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
    categoryId: string | undefined | null,
    userId: string,
    transactionType: TransactionType,
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

    const typeMismatch =
      (category.type === CategoryType.INCOME &&
        transactionType !== TransactionType.INCOME) ||
      (category.type === CategoryType.EXPENSE &&
        transactionType !== TransactionType.EXPENSE);

    if (typeMismatch) {
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
   * Validate that the transaction amount is valid (non-negative)
   * @param amount - The amount to validate
   * @throws BusinessError if amount is negative
   */
  private validateAmount(amount: number): void {
    if (amount < 0) {
      throw new BusinessError(
        "Transaction amount cannot be negative",
        BusinessErrorCodes.INVALID_AMOUNT,
        { amount },
      );
    }
  }

  /**
   * Validate that the transaction date is in the correct format (YYYY-MM-DD)
   * @param date - The date string to validate
   * @throws BusinessError if date format is invalid
   */
  private validateDate(date: string): void {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new BusinessError(
        "Transaction date must be in YYYY-MM-DD format",
        BusinessErrorCodes.INVALID_DATE,
        { date },
      );
    }
  }

  /**
   * Create a new transaction with full business validation
   * @param input - Transaction creation input (currency will be derived from account)
   * @param userId - The user ID creating the transaction
   * @returns Promise<Transaction> - The created transaction
   * @throws BusinessError for any business rule violations
   */
  async createTransaction(
    input: CreateTransactionServiceInput,
    userId: string,
  ): Promise<Transaction> {
    // Validate business rules
    const account = await this.validateAccount(input.accountId, userId);
    await this.validateCategory(input.categoryId, userId, input.type);

    // Additional input validation
    this.validateAmount(input.amount);
    this.validateDate(input.date);

    // Create the transaction through repository
    const createInput: CreateTransactionInput = {
      ...input,
      userId,
      currency: account.currency,
    };

    return await this.transactionRepository.create(createInput);
  }

  /**
   * Get active transactions for a user with pagination, sorted by date (newest first)
   * @param userId - The user ID to get transactions for
   * @param pagination - Optional pagination parameters (first, after)
   * @returns Promise<TransactionConnection> - Paginated transaction results with cursor information
   */
  async getTransactionsByUser(
    userId: string,
    pagination?: PaginationInput,
  ): Promise<TransactionConnection> {
    return await this.transactionRepository.findActiveByUserId(
      userId,
      pagination,
    );
  }

  /**
   * Update an existing transaction with business validation
   * @param id - Transaction ID to update
   * @param userId - User ID owning the transaction
   * @param input - Partial update input (currency automatically updated when account changes)
   * @returns Promise<Transaction> - The updated transaction
   * @throws BusinessError for any business rule violations
   */
  async updateTransaction(
    id: string,
    userId: string,
    input: UpdateTransactionServiceInput,
  ): Promise<Transaction> {
    // First verify the transaction exists and belongs to the user
    const existingTransaction = await this.transactionRepository.findById(
      id,
      userId,
    );
    if (!existingTransaction) {
      throw new BusinessError(
        "Transaction not found or doesn't belong to user",
        BusinessErrorCodes.TRANSACTION_NOT_FOUND,
        { transactionId: id, userId },
      );
    }

    // Validate account if provided
    let account;
    if (input.accountId) {
      account = await this.validateAccount(input.accountId, userId);
    } else {
      // Get current account for reference
      account = await this.validateAccount(
        existingTransaction.accountId,
        userId,
      );
    }

    // Validate category if provided (only if transaction type is also provided or can be determined)
    const transactionType = input.type || existingTransaction.type;
    if (input.categoryId) {
      await this.validateCategory(input.categoryId, userId, transactionType);
    }

    // Additional input validation
    if (input.amount !== undefined) {
      this.validateAmount(input.amount);
    }

    if (input.date) {
      this.validateDate(input.date);
    }

    // Update the transaction through repository, including currency if account changed
    const updateInput: UpdateTransactionInput = {
      ...input,
      ...(input.accountId && { currency: account.currency }),
    };

    return await this.transactionRepository.update(id, userId, updateInput);
  }

  /**
   * Archive (soft delete) an existing transaction
   * @param id - Transaction ID to archive
   * @param userId - User ID owning the transaction
   * @returns Promise<Transaction> - The archived transaction
   * @throws BusinessError if transaction not found or doesn't belong to user
   */
  async deleteTransaction(id: string, userId: string): Promise<Transaction> {
    // First verify the transaction exists and belongs to the user
    const existingTransaction = await this.transactionRepository.findById(
      id,
      userId,
    );
    if (!existingTransaction) {
      throw new BusinessError(
        "Transaction not found or doesn't belong to user",
        BusinessErrorCodes.TRANSACTION_NOT_FOUND,
        { transactionId: id, userId },
      );
    }

    // Check if transaction is already archived - if so, return it as-is
    if (existingTransaction.isArchived) {
      return existingTransaction;
    }

    // Archive the transaction through repository
    return await this.transactionRepository.archive(id, userId);
  }
}
