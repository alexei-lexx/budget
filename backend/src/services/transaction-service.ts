import { Account, IAccountRepository } from "../models/account";
import {
  Category,
  CategoryType,
  ICategoryRepository,
} from "../models/category";
import {
  CreateTransactionInput,
  EnrichedTransactionPattern,
  ITransactionRepository,
  Transaction,
  TransactionConnection,
  TransactionFilterInput,
  TransactionPatternType,
  TransactionType,
  UpdateTransactionInput,
} from "../models/transaction";
import { PaginationInput } from "../types/pagination";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import {
  amountSchema,
  dateSchema,
  descriptionSchema,
  formatZodErrors,
  searchTextSchema,
} from "./validation-schemas";

export const DEFAULT_TRANSACTION_PATTERNS_LIMIT = 3;
export const MIN_TRANSACTION_PATTERNS_LIMIT = 1;
export const MAX_TRANSACTION_PATTERNS_LIMIT = 10;

export const DEFAULT_DESCRIPTION_SUGGESTIONS_LIMIT = 5;
export const MIN_DESCRIPTION_SUGGESTIONS_LIMIT = 1;
export const MAX_DESCRIPTION_SUGGESTIONS_LIMIT = 10;
export const DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE = 100;

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
    const account = await this.accountRepository.findActiveById(
      accountId,
      userId,
    );

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

    const category = await this.categoryRepository.findActiveById(
      categoryId,
      userId,
    );

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
        transactionType !== TransactionType.EXPENSE &&
        transactionType !== TransactionType.REFUND);

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
    if (!amountSchema.safeParse(amount).success) {
      throw new BusinessError(
        "Transaction amount cannot be negative",
        BusinessErrorCodes.INVALID_AMOUNT,
      );
    }
  }

  /**
   * Validate that the transaction date is in the correct format (YYYY-MM-DD)
   * @param date - The date string to validate
   * @throws BusinessError if date format is invalid
   */
  private validateDate(date: string): void {
    if (!dateSchema.safeParse(date).success) {
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
    this.validateDescription(input.description);

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
   * @param filters - Optional filter criteria (account, category, date, type)
   * @returns Promise<TransactionConnection> - Paginated transaction results with cursor information
   */
  async getTransactionsByUser(
    userId: string,
    pagination?: PaginationInput,
    filters?: TransactionFilterInput,
  ): Promise<TransactionConnection> {
    if (
      filters?.dateAfter &&
      filters?.dateBefore &&
      filters.dateAfter > filters.dateBefore
    ) {
      throw new BusinessError(
        "Invalid date range: From date must be before or equal to To date",
        BusinessErrorCodes.INVALID_DATE,
        { dateAfter: filters.dateAfter, dateBefore: filters.dateBefore },
      );
    }

    return await this.transactionRepository.findActiveByUserId(
      userId,
      pagination,
      filters,
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
    const existingTransaction = await this.transactionRepository.findActiveById(
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

    if (input.description !== undefined) {
      this.validateDescription(input.description);
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
    const existingTransaction = await this.transactionRepository.findActiveById(
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

  /**
   * Get patterns for a user by analyzing transaction history
   * @param userId - The user ID to get patterns for
   * @param type - Transaction type to analyze (INCOME, EXPENSE, REFUND)
   * @param limit - Maximum number of patterns to return
   * @param sampleSize - Number of transactions to analyze (default: 100)
   * @returns Promise<EnrichedTransactionPattern[]> - Validated patterns with full account and category objects
   */
  async getTransactionPatterns(
    userId: string,
    type: TransactionPatternType,
    limit?: number | null,
    sampleSize = 100,
  ): Promise<EnrichedTransactionPattern[]> {
    // Validate and normalize the limit parameter
    const validatedLimit = this.validateTransactionPatternsLimit(limit);

    // Get raw patterns from repository
    const patterns = await this.transactionRepository.detectPatterns(
      userId,
      type,
      validatedLimit,
      sampleSize,
    );

    // Validate and enrich patterns with full account and category objects
    const enrichedPatterns: EnrichedTransactionPattern[] = [];

    for (const pattern of patterns) {
      // Validate that account still exists and belongs to user
      const account = await this.accountRepository.findActiveById(
        pattern.accountId,
        userId,
      );
      if (!account) {
        // Skip pattern if account is deleted/archived
        continue;
      }

      // Validate that category still exists and belongs to user
      const category = await this.categoryRepository.findActiveById(
        pattern.categoryId,
        userId,
      );
      if (!category) {
        // Skip pattern if category is deleted/archived
        continue;
      }

      // Validate that category type matches transaction type
      // REFUND and EXPENSE both use expense categories
      const expectedCategoryType =
        type === TransactionPatternType.INCOME
          ? CategoryType.INCOME
          : CategoryType.EXPENSE;
      if (category.type !== expectedCategoryType) {
        // Skip pattern if category type doesn't match
        continue;
      }

      // Create enriched pattern
      enrichedPatterns.push({
        accountId: pattern.accountId,
        categoryId: pattern.categoryId,
        accountName: account.name,
        categoryName: category.name,
      });
    }

    return enrichedPatterns;
  }

  /**
   * Get transaction description suggestions based on user's transaction history
   * @param userId - The user ID to get suggestions for
   * @param searchText - The search text to match against descriptions
   * @param limit - Maximum number of suggestions to return
   * @param sampleSize - Number of transactions to analyze for suggestions
   * @returns Promise<string[]> - Descriptions ordered by frequency (most frequent first)
   * @throws BusinessError if searchText is too short
   */
  async getDescriptionSuggestions(
    userId: string,
    searchText: string,
    limit?: number | null,
    sampleSize = DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE,
  ): Promise<string[]> {
    // Validate search text
    const parsedSearchText = searchTextSchema.safeParse(searchText);
    if (!parsedSearchText.success) {
      throw new BusinessError(
        formatZodErrors(parsedSearchText.error),
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    // Validate and normalize the limit parameter
    const validatedLimit = this.validateDescriptionSuggestionsLimit(limit);

    // Get transactions matching the search text from repository
    // Use configurable sample size to ensure we have enough data for processing
    const transactions =
      await this.transactionRepository.findActiveByDescription(
        userId,
        parsedSearchText.data,
        sampleSize,
      );

    // Extract and count unique descriptions by frequency
    const descriptionFrequency = new Map<string, number>();

    for (const transaction of transactions) {
      // TypeScript check: description is optional in the type but repository guarantees it exists
      if (!transaction.description) {
        continue;
      }

      const description = transaction.description;
      const currentCount = descriptionFrequency.get(description) || 0;
      descriptionFrequency.set(description, currentCount + 1);
    }

    // Sort descriptions by frequency (highest first) and return top N
    return Array.from(descriptionFrequency.entries())
      .sort(([, frequencyA], [, frequencyB]) => frequencyB - frequencyA) // Sort by frequency descending
      .slice(0, validatedLimit) // Take top N
      .map(([description]) => description); // Extract just the description strings
  }

  /**
   * Validate transaction patterns limit parameter
   * @param limit - The limit to validate (can be null, undefined, or number)
   * @returns number - Valid limit between 1-10, defaults to 3 for invalid values
   */
  private validateTransactionPatternsLimit(limit?: number | null): number {
    // Use default if limit is not provided or is null
    if (limit == null) {
      return DEFAULT_TRANSACTION_PATTERNS_LIMIT;
    }

    // Validate range and return default for invalid values
    if (
      limit < MIN_TRANSACTION_PATTERNS_LIMIT ||
      limit > MAX_TRANSACTION_PATTERNS_LIMIT ||
      !Number.isInteger(limit)
    ) {
      return DEFAULT_TRANSACTION_PATTERNS_LIMIT;
    }

    return limit;
  }

  /**
   * Validate description suggestions limit parameter
   * @param limit - The limit to validate (can be null, undefined, or number)
   * @returns number
   */
  private validateDescriptionSuggestionsLimit(limit?: number | null): number {
    // Use default if limit is not provided or is null
    if (limit == null) {
      return DEFAULT_DESCRIPTION_SUGGESTIONS_LIMIT;
    }

    // Validate range and return default for invalid values
    if (
      limit < MIN_DESCRIPTION_SUGGESTIONS_LIMIT ||
      limit > MAX_DESCRIPTION_SUGGESTIONS_LIMIT ||
      !Number.isInteger(limit)
    ) {
      return DEFAULT_DESCRIPTION_SUGGESTIONS_LIMIT;
    }

    return limit;
  }

  private validateDescription(description: string | null | undefined): void {
    const parsedDescription = descriptionSchema.safeParse(description);

    if (!parsedDescription.success) {
      throw new BusinessError(
        formatZodErrors(parsedDescription.error),
        BusinessErrorCodes.INVALID_DESCRIPTION,
      );
    }
  }
}
