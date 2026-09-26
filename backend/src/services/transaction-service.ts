import { randomUUID } from "crypto";
import { Account } from "../models/account";
import { Category } from "../models/category";
import {
  NonTransferTransactionType,
  Transaction,
  TransactionPattern,
  TransactionPatternType,
  TransactionType,
} from "../models/transaction";
import { AccountRepository } from "../ports/account-repository";
import { AtomicWriter } from "../ports/atomic-writer";
import { CategoryRepository } from "../ports/category-repository";
import {
  TransactionConnection,
  TransactionFilterInput,
  TransactionRepository,
} from "../ports/transaction-repository";
import { DateString } from "../types/date-string";
import {
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  PaginationInput,
} from "../types/pagination";
import { Failure, Result, Success } from "../types/result";

export const MIN_SEARCH_TEXT_LENGTH = 2;

export const DEFAULT_TRANSACTION_PATTERNS_LIMIT = 3;
export const MIN_TRANSACTION_PATTERNS_LIMIT = 1;
export const MAX_TRANSACTION_PATTERNS_LIMIT = 10;

export const DEFAULT_DESCRIPTION_SUGGESTIONS_LIMIT = 5;
export const MIN_DESCRIPTION_SUGGESTIONS_LIMIT = 1;
export const MAX_DESCRIPTION_SUGGESTIONS_LIMIT = 10;
export const DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE = 100;

/**
 * Service layer input for creating transactions
 */
export interface CreateTransactionServiceInput {
  accountId: string;
  amount: number;
  categoryId?: string;
  date: DateString;
  description?: string;
  type: NonTransferTransactionType; // INCOME, EXPENSE, or REFUND
}

/**
 * Service layer input for creating a compound transaction
 */
export interface CreateCompoundTransactionServiceInput {
  type: NonTransferTransactionType;
  accountId: string;
  date: DateString;
  expectedTotal: number;
  legs: {
    amount: number;
    categoryId?: string;
    description?: string;
  }[];
}

/**
 * Service layer input for updating transactions
 */
export type UpdateTransactionServiceInput = Partial<
  Omit<CreateTransactionServiceInput, "categoryId" | "description">
> & {
  categoryId?: string | null; // Allow null to remove category association
  description?: string | null; // Allow null to clear description
};

export interface EnrichedTransactionPattern extends TransactionPattern {
  accountName: string;
  categoryName: string;
}

export interface TransactionService {
  getTransactionById(id: string, userId: string): Promise<Result<Transaction>>;
  getTransactionsByUser(
    userId: string,
    pagination?: PaginationInput,
    filters?: TransactionFilterInput,
  ): Promise<Result<TransactionConnection>>;
  getTransactionPatterns(
    userId: string,
    type: TransactionPatternType,
    limit?: number | null,
    sampleSize?: number,
  ): Promise<Result<EnrichedTransactionPattern[]>>;
  getDescriptionSuggestions(
    userId: string,
    searchText: string,
    limit?: number | null,
    sampleSize?: number,
  ): Promise<Result<string[]>>;
  createTransaction(
    input: CreateTransactionServiceInput,
    userId: string,
  ): Promise<Result<Transaction>>;
  createCompoundTransaction(
    input: CreateCompoundTransactionServiceInput,
    userId: string,
  ): Promise<Result<Transaction[]>>;

  updateTransaction(
    id: string,
    userId: string,
    input: UpdateTransactionServiceInput,
  ): Promise<Result<Transaction>>;
  deleteTransaction(id: string, userId: string): Promise<Result<Transaction>>;
}

/**
 * Transaction service class for handling business logic and validation
 * Implements the service layer pattern for transaction operations
 */
export class TransactionServiceImpl implements TransactionService {
  private accountRepository: AccountRepository;
  private categoryRepository: CategoryRepository;
  private transactionRepository: TransactionRepository;
  private atomicWriter: AtomicWriter;

  constructor(deps: {
    accountRepository: AccountRepository;
    categoryRepository: CategoryRepository;
    transactionRepository: TransactionRepository;
    atomicWriter: AtomicWriter;
  }) {
    this.accountRepository = deps.accountRepository;
    this.categoryRepository = deps.categoryRepository;
    this.transactionRepository = deps.transactionRepository;
    this.atomicWriter = deps.atomicWriter;
  }

  /**
   * Get a single transaction by ID with ownership validation
   * @param id - The transaction ID to retrieve
   * @param userId - The user ID to validate ownership
   * @returns The retrieved transaction, or a failure reason
   */
  async getTransactionById(
    id: string,
    userId: string,
  ): Promise<Result<Transaction>> {
    const transaction = await this.transactionRepository.findOneById({
      id,
      userId,
    });
    if (!transaction) {
      return Failure("Transaction not found or doesn't belong to user");
    }
    return Success(transaction);
  }

  /**
   * Create a new transaction with full business validation
   * @param input - Transaction creation input (currency will be derived from account)
   * @param userId - The user ID creating the transaction
   * @returns The created transaction, or a failure reason
   */
  async createTransaction(
    input: CreateTransactionServiceInput,
    userId: string,
  ): Promise<Result<Transaction>> {
    const account = await this.accountRepository.findOneById({
      id: input.accountId,
      userId,
    });

    if (!account) {
      return Failure("Account not found or doesn't belong to user");
    }

    let category: Category | undefined;

    if (input.categoryId) {
      category =
        (await this.categoryRepository.findOneById({
          id: input.categoryId,
          userId,
        })) ?? undefined;

      if (!category) {
        return Failure("Category not found or doesn't belong to user");
      }
    }

    const transactionToCreate = Transaction.create({
      ...input,
      userId,
      account,
      category,
    });

    const accountToUpdate = account.increaseBalanceBySignedAmount(
      transactionToCreate.signedAmount,
    );

    const result = await this.atomicWriter.commit({
      transactionsToCreate: [transactionToCreate],
      accountsToUpdate: [accountToUpdate],
    });

    const createdTransaction = result.createdTransactions[0];
    if (createdTransaction === undefined) {
      throw new Error("Atomic writer did not return the created transaction");
    }

    return Success(createdTransaction);
  }

  /**
   * Create 2 or more transactions in one atomic call,
   * sharing one account, one date, and one type,
   * stamped with a shared compound transaction id and total amount
   */
  async createCompoundTransaction(
    input: CreateCompoundTransactionServiceInput,
    userId: string,
  ): Promise<Result<Transaction[]>> {
    const { legs } = input;

    if (legs.length < 2) {
      return Failure("Compound transaction requires at least 2 legs");
    }

    const legsTotal = legs.reduce((sum, leg) => sum + leg.amount, 0);

    if (Math.abs(legsTotal - input.expectedTotal) > 1e-9) {
      return Failure("Leg amounts must sum to the expected total");
    }

    const categoryIds = legs.map((leg) => leg.categoryId);
    if (new Set(categoryIds).size !== categoryIds.length) {
      return Failure(
        "Compound transaction legs must have distinct categories, with at most one uncategorized leg",
      );
    }

    const accountResult = await this.validateAccount(input.accountId, userId);
    if (!accountResult.success) return accountResult;
    const account = accountResult.data;

    const compoundTransactionId = randomUUID();

    const transactionsToCreate: Transaction[] = [];

    for (const leg of legs) {
      const categoryResult = await this.validateCategory(
        leg.categoryId,
        userId,
        input.type,
      );
      if (!categoryResult.success) return categoryResult;

      transactionsToCreate.push(
        Transaction.create({
          userId,
          account,
          category: categoryResult.data ?? undefined,
          type: input.type,
          amount: leg.amount,
          date: input.date,
          description: leg.description,
          compoundTransaction: {
            id: compoundTransactionId,
            totalAmount: input.expectedTotal,
          },
        }),
      );
    }

    const accountToUpdate = transactionsToCreate.reduce(
      (currentAccount, transaction) =>
        currentAccount.increaseBalanceBySignedAmount(transaction.signedAmount),
      account,
    );

    const result = await this.atomicWriter.commit({
      transactionsToCreate,
      accountsToUpdate: [accountToUpdate],
    });

    return Success([...result.createdTransactions]);
  }

  /**
   * Get active transactions for a user with pagination, sorted by date (newest first)
   * @param userId - The user ID to get transactions for
   * @param pagination - Optional pagination parameters (first, after)
   * @param filters - Optional filter criteria (account, category, date, type)
   * @returns Paginated transaction results with cursor information, or a failure reason
   */
  async getTransactionsByUser(
    userId: string,
    pagination?: PaginationInput,
    filters?: TransactionFilterInput,
  ): Promise<Result<TransactionConnection>> {
    if (
      pagination?.first !== undefined &&
      (pagination.first < MIN_PAGE_SIZE || pagination.first > MAX_PAGE_SIZE)
    ) {
      return Failure(
        `Pagination first must be between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}`,
      );
    }

    if (
      filters?.dateAfter &&
      filters?.dateBefore &&
      filters.dateAfter > filters.dateBefore
    ) {
      return Failure("Filter dateAfter cannot be later than dateBefore");
    }

    const connection =
      await this.transactionRepository.findManyByUserIdPaginated(
        userId,
        pagination,
        filters,
      );

    return Success(connection);
  }

  /**
   * Update an existing transaction with business validation
   * @param id - Transaction ID to update
   * @param userId - User ID owning the transaction
   * @param input - Partial update input (currency automatically updated when account changes)
   * @returns The updated transaction, or a failure reason
   */
  async updateTransaction(
    id: string,
    userId: string,
    input: UpdateTransactionServiceInput,
  ): Promise<Result<Transaction>> {
    // First verify the transaction exists and belongs to the user
    const existingTransaction = await this.transactionRepository.findOneById({
      id,
      userId,
    });
    if (!existingTransaction) {
      return Failure("Transaction not found or doesn't belong to user");
    }

    let newAccount: Account | undefined;
    if (input.accountId) {
      const accountResult = await this.validateAccount(input.accountId, userId);
      if (!accountResult.success) return accountResult;
      newAccount = accountResult.data;
    }

    const transactionType = input.type ?? existingTransaction.type;
    let category: Category | null | undefined;
    if (input.categoryId === undefined) {
      category = undefined;
    } else if (input.categoryId === null) {
      category = null;
    } else {
      const categoryResult = await this.validateCategory(
        input.categoryId,
        userId,
        transactionType,
      );
      if (!categoryResult.success) return categoryResult;
      category = categoryResult.data;
    }

    const transactionToUpdate = existingTransaction.update({
      account: newAccount,
      category,
      type: input.type,
      amount: input.amount,
      date: input.date,
      description: input.description,
    });

    const isBalanceAffected =
      existingTransaction.accountId !== transactionToUpdate.accountId ||
      existingTransaction.signedAmount !== transactionToUpdate.signedAmount;

    let accountsToUpdate: Account[] = [];

    if (isBalanceAffected) {
      if (existingTransaction.accountId === transactionToUpdate.accountId) {
        // Same account — single fetch (with-archived); chain decrease then increase.
        const account = await this.accountRepository.findOneWithArchivedById({
          id: existingTransaction.accountId,
          userId,
        });

        if (!account) {
          return Failure("Account not found");
        }

        accountsToUpdate = [
          account
            .decreaseBalanceBySignedAmount(existingTransaction.signedAmount)
            .increaseBalanceBySignedAmount(transactionToUpdate.signedAmount),
        ];
      } else {
        // Cross-account — separate decrement on old, increment on new.
        const oldAccount = await this.accountRepository.findOneWithArchivedById(
          {
            id: existingTransaction.accountId,
            userId,
          },
        );

        if (!oldAccount) {
          return Failure("Old account not found");
        }

        if (!newAccount) {
          return Failure("New account not found");
        }

        accountsToUpdate = [
          oldAccount.decreaseBalanceBySignedAmount(
            existingTransaction.signedAmount,
          ),
          newAccount.increaseBalanceBySignedAmount(
            transactionToUpdate.signedAmount,
          ),
        ];
      }
    }

    const result = await this.atomicWriter.commit({
      transactionsToUpdate: [transactionToUpdate],
      accountsToUpdate: accountsToUpdate,
    });

    const updatedTransaction = result.updatedTransactions[0];
    if (updatedTransaction === undefined) {
      throw new Error("Atomic writer did not return the updated transaction");
    }

    return Success(updatedTransaction);
  }

  /**
   * Archive (soft delete) an existing transaction
   * @param id - Transaction ID to archive
   * @param userId - User ID owning the transaction
   * @returns The archived transaction, or a failure reason
   */
  async deleteTransaction(
    id: string,
    userId: string,
  ): Promise<Result<Transaction>> {
    // First verify the transaction exists and belongs to the user
    const existingTransaction = await this.transactionRepository.findOneById({
      id,
      userId,
    });
    if (!existingTransaction) {
      return Failure("Transaction not found or doesn't belong to user");
    }

    // Check if transaction is already archived - if so, return it as-is
    if (existingTransaction.isArchived) {
      return Success(existingTransaction);
    }

    const account = await this.accountRepository.findOneWithArchivedById({
      id: existingTransaction.accountId,
      userId,
    });

    if (!account) {
      return Failure("Account not found");
    }

    const transactionToArchive = existingTransaction.archive();
    const accountToUpdate = account.decreaseBalanceBySignedAmount(
      transactionToArchive.signedAmount,
    );

    const result = await this.atomicWriter.commit({
      transactionsToUpdate: [transactionToArchive],
      accountsToUpdate: [accountToUpdate],
    });

    const archivedTransaction = result.updatedTransactions[0];
    if (archivedTransaction === undefined) {
      throw new Error("Atomic writer did not return the archived transaction");
    }

    return Success(archivedTransaction);
  }

  /**
   * Get patterns for a user by analyzing transaction history
   * @param userId - The user ID to get patterns for
   * @param type - Transaction type to analyze (INCOME, EXPENSE, REFUND)
   * @param limit - Maximum number of patterns to return
   * @param sampleSize - Number of transactions to analyze (default: 100)
   * @returns Validated patterns with full account and category objects, or a failure reason
   */
  async getTransactionPatterns(
    userId: string,
    type: TransactionPatternType,
    limit?: number | null,
    sampleSize = 100,
  ): Promise<Result<EnrichedTransactionPattern[]>> {
    // Validate and normalize the limit parameter
    const validatedLimit = this.validateTransactionPatternsLimit(limit);

    // Get raw patterns from repository
    const patterns = await this.transactionRepository.detectPatterns({
      userId,
      type,
      limit: validatedLimit,
      sampleSize,
    });

    // Validate and enrich patterns with full account and category objects
    const enrichedPatterns: EnrichedTransactionPattern[] = [];

    for (const pattern of patterns) {
      // Validate that account still exists and belongs to user
      const account = await this.accountRepository.findOneById({
        id: pattern.accountId,
        userId,
      });
      if (!account) {
        // Skip pattern if account is deleted/archived
        continue;
      }

      // Validate that category still exists and belongs to user
      const category = await this.categoryRepository.findOneById({
        id: pattern.categoryId,
        userId,
      });
      if (!category) {
        // Skip pattern if category is deleted/archived
        continue;
      }

      // Validate that category type matches transaction type
      // REFUND and EXPENSE both use expense categories
      const expectedCategoryType = type === "INCOME" ? "INCOME" : "EXPENSE";
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

    return Success(enrichedPatterns);
  }

  /**
   * Get transaction description suggestions based on user's transaction history
   * @param userId - The user ID to get suggestions for
   * @param searchText - The search text to match against descriptions
   * @param limit - Maximum number of suggestions to return
   * @param sampleSize - Number of transactions to analyze for suggestions
   * @returns Descriptions ordered by frequency (most frequent first), or a failure reason
   */
  async getDescriptionSuggestions(
    userId: string,
    searchText: string,
    limit?: number | null,
    sampleSize = DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE,
  ): Promise<Result<string[]>> {
    // Validate search text length
    const normalizedSearchText = searchText.trim();
    if (normalizedSearchText.length < MIN_SEARCH_TEXT_LENGTH) {
      return Failure(
        `Search text must be at least ${MIN_SEARCH_TEXT_LENGTH} characters long`,
      );
    }

    // Validate and normalize the limit parameter
    const validatedLimit = this.validateDescriptionSuggestionsLimit(limit);

    // Get transactions matching the search text from repository
    // Use configurable sample size to ensure we have enough data for processing
    const transactions = await this.transactionRepository.findManyByDescription(
      {
        userId,
        searchText: normalizedSearchText,
        limit: sampleSize,
      },
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
    const suggestions = Array.from(descriptionFrequency.entries())
      .sort(([, frequencyA], [, frequencyB]) => frequencyB - frequencyA) // Sort by frequency descending
      .slice(0, validatedLimit) // Take top N
      .map(([description]) => description); // Extract just the description strings

    return Success(suggestions);
  }

  /**
   * Validate that an account exists and belongs to the user
   * @param accountId - The account ID to validate
   * @param userId - The user ID to check ownership
   * @returns The validated account, or a failure reason
   */
  private async validateAccount(
    accountId: string,
    userId: string,
  ): Promise<Result<Account>> {
    const account = await this.accountRepository.findOneById({
      id: accountId,
      userId,
    });

    if (!account) {
      return Failure("Account not found or doesn't belong to user");
    }

    return Success(account);
  }

  /**
   * Validate that a category exists, belongs to the user, and matches the transaction type
   * @param categoryId - The category ID to validate (optional)
   * @param userId - The user ID to check ownership
   * @param transactionType - The transaction type to match against category type
   * @returns The validated category (or null if not provided), or a failure reason
   */
  private async validateCategory(
    categoryId: string | undefined | null,
    userId: string,
    transactionType: TransactionType,
  ): Promise<Result<Category | null>> {
    if (!categoryId) {
      return Success(null);
    }

    const category = await this.categoryRepository.findOneById({
      id: categoryId,
      userId,
    });

    if (!category) {
      return Failure("Category not found or doesn't belong to user");
    }

    const typeMismatch =
      (category.type === "INCOME" && transactionType !== "INCOME") ||
      (category.type === "EXPENSE" &&
        transactionType !== "EXPENSE" &&
        transactionType !== "REFUND");

    if (typeMismatch) {
      return Failure(
        `Category type "${category.type}" doesn't match transaction type "${transactionType}"`,
      );
    }

    return Success(category);
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
}
