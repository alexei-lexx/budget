import { Account } from "../models/account";
import { getSignedAmount } from "../models/transaction";
import {
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  SUPPORTED_CURRENCIES,
} from "../types/validation";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import {
  AccountRepository,
  CreateAccountInput,
  UpdateAccountInput,
} from "./ports/account-repository";
import { TransactionRepository } from "./ports/transaction-repository";

/**
 * Account service class for handling business logic and cross-repository operations
 * Implements the service layer pattern for account operations
 */
export class AccountService {
  constructor(
    private accountRepository: AccountRepository,
    private transactionRepository: TransactionRepository,
  ) {}

  /**
   * Get all active accounts for a user
   * @param userId - The user ID to get accounts for
   * @returns Promise<Account[]> - List of active accounts
   */
  async getAccountsByUser(userId: string): Promise<Account[]> {
    return await this.accountRepository.findActiveByUserId(userId);
  }

  /**
   * Create a new account for a user
   * @param input - Account creation input
   * @returns Promise<Account> - The created account
   */
  async createAccount(input: CreateAccountInput): Promise<Account> {
    const validatedInput = {
      ...input,
      name: this.validateName(input.name),
      currency: this.validateCurrency(input.currency),
    };

    // Check for duplicate names
    await this.checkDuplicateName(validatedInput.userId, validatedInput.name);

    return await this.accountRepository.create(validatedInput);
  }

  /**
   * Update an account
   * Enforces business rule: cannot change currency if account has existing transactions
   * @param id - Account ID to update
   * @param userId - User ID for authorization
   * @param input - Account update input
   * @returns Promise<Account> - The updated account
   * @throws BusinessError if account not found or has transactions with currency change
   */
  async updateAccount(
    id: string,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<Account> {
    // Fetch current account
    const currentAccount = await this.accountRepository.findActiveById(
      id,
      userId,
    );

    if (!currentAccount) {
      throw new BusinessError(
        "Account not found",
        BusinessErrorCodes.ACCOUNT_NOT_FOUND,
        { accountId: id, userId },
      );
    }

    const validatedInput = {
      ...input,
      ...(input.name !== undefined && { name: this.validateName(input.name) }),
      ...(input.currency !== undefined && {
        currency: this.validateCurrency(input.currency),
      }),
    };

    // Check for duplicate names if name is being updated
    if (validatedInput.name !== undefined) {
      await this.checkDuplicateName(userId, validatedInput.name, id);
    }

    // If currency is being changed, check for existing transactions
    if (
      validatedInput.currency &&
      currentAccount.currency !== validatedInput.currency
    ) {
      const hasTransactions =
        await this.transactionRepository.hasTransactionsForAccount(id, userId);

      if (hasTransactions) {
        throw new BusinessError(
          "Cannot change currency for account that has existing transactions. Please create a new account with the desired currency instead.",
          BusinessErrorCodes.ACCOUNT_CURRENCY_CHANGE_BLOCKED,
          {
            accountId: id,
            currentCurrency: currentAccount.currency,
            requestedCurrency: validatedInput.currency,
          },
        );
      }
    }

    return await this.accountRepository.update(id, userId, validatedInput);
  }

  /**
   * Archive (soft-delete) an account
   * @param id - Account ID to archive
   * @param userId - User ID for authorization
   * @returns Promise<Account> - The archived account
   */
  async deleteAccount(id: string, userId: string): Promise<Account> {
    return await this.accountRepository.archive(id, userId);
  }

  /**
   * Calculate the current balance for an account based on its initial balance and transaction history
   * Formula: initialBalance + INCOME transactions - EXPENSE transactions
   * @param accountId - The account ID to calculate balance for
   * @param userId - The user ID to verify ownership and scope queries
   * @returns Promise<number> - The calculated current balance
   * @throws BusinessError if account not found
   */
  async calculateBalance(accountId: string, userId: string): Promise<number> {
    // First validate that the account exists and belongs to the user
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

    // Get all transactions for this account
    const transactions = await this.transactionRepository.findActiveByAccountId(
      accountId,
      userId,
    );

    // Calculate balance: initialBalance + INCOME + REFUND + TRANSFER_IN - EXPENSE - TRANSFER_OUT
    const balance = transactions.reduce(
      (sum, transaction) => sum + getSignedAmount(transaction),
      account.initialBalance,
    );

    return balance;
  }

  private validateName(name: string): string {
    const trimmedName = name.trim();

    if (
      trimmedName.length < NAME_MIN_LENGTH ||
      trimmedName.length > NAME_MAX_LENGTH
    ) {
      throw new BusinessError(
        `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    return trimmedName;
  }

  private validateCurrency(currency: string): string {
    const normalizedCurrency = currency.trim().toUpperCase();

    if (!SUPPORTED_CURRENCIES.includes(normalizedCurrency)) {
      throw new BusinessError(
        `Unsupported currency: ${normalizedCurrency}. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`,
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    return normalizedCurrency;
  }

  private async checkDuplicateName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existingAccounts =
      await this.accountRepository.findActiveByUserId(userId);
    const duplicateAccount = existingAccounts.find(
      (account) =>
        account.name.toLowerCase() === name.toLowerCase() &&
        account.id !== excludeId,
    );

    if (duplicateAccount) {
      throw new BusinessError(
        `Account "${name}" already exists`,
        BusinessErrorCodes.DUPLICATE_NAME,
      );
    }
  }
}
