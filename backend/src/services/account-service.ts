import {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from "../models/account";
import { AccountRepository } from "../ports/account-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { BusinessError } from "./business-error";

export interface AccountService {
  getAccountsByUser(userId: string): Promise<Account[]>;
  calculateBalance(accountId: string, userId: string): Promise<number>;
  createAccount(input: CreateAccountInput): Promise<Account>;
  updateAccount(
    id: string,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<Account>;
  deleteAccount(id: string, userId: string): Promise<Account>;
}

/**
 * Account service class for handling business logic and cross-repository operations
 * Implements the service layer pattern for account operations
 */
export class AccountServiceImpl implements AccountService {
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
    return await this.accountRepository.findManyByUserId(userId);
  }

  /**
   * Create a new account for a user
   * @param input - Account creation input
   * @returns Promise<Account> - The created account
   */
  async createAccount(input: CreateAccountInput): Promise<Account> {
    const account = Account.create(input);

    await this.checkDuplicateName(account.userId, account.name);
    await this.accountRepository.create(account);
    return account;
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
    // Fetch existing account
    const existingAccount = await this.accountRepository.findOneById({
      id,
      userId,
    });

    if (!existingAccount) {
      throw new BusinessError("Account not found");
    }

    const updatedAccount = existingAccount.update(input);

    // Check for duplicate names if name is being updated
    if (updatedAccount.name !== existingAccount.name) {
      await this.checkDuplicateName(userId, updatedAccount.name, id);
    }

    // If currency is being changed, check for existing transactions
    if (existingAccount.currency !== updatedAccount.currency) {
      const hasTransactions =
        await this.transactionRepository.hasTransactionsForAccount({
          accountId: id,
          userId,
        });

      if (hasTransactions) {
        throw new BusinessError(
          "Cannot change currency for account that has existing transactions. Please create a new account with the desired currency instead.",
        );
      }
    }

    return await this.accountRepository.update(updatedAccount);
  }

  /**
   * Archive (soft-delete) an account
   * @param id - Account ID to archive
   * @param userId - User ID for authorization
   * @returns Promise<Account> - The archived account
   */
  async deleteAccount(id: string, userId: string): Promise<Account> {
    const existingAccount = await this.accountRepository.findOneById({
      id,
      userId,
    });

    if (!existingAccount) {
      throw new BusinessError("Account not found");
    }

    return await this.accountRepository.update(existingAccount.archive());
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
    const account = await this.accountRepository.findOneById({
      id: accountId,
      userId,
    });

    if (!account) {
      throw new BusinessError("Account not found or doesn't belong to user");
    }

    // Get all transactions for this account
    const transactions = await this.transactionRepository.findManyByAccountId({
      accountId,
      userId,
    });

    // Calculate balance: initialBalance + INCOME + REFUND + TRANSFER_IN - EXPENSE - TRANSFER_OUT
    const balance = transactions.reduce(
      (sum, transaction) => sum + transaction.signedAmount,
      account.initialBalance,
    );

    return balance;
  }

  private async checkDuplicateName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existingAccounts =
      await this.accountRepository.findManyByUserId(userId);
    const duplicateAccount = existingAccounts.find(
      (account) =>
        account.name.toLowerCase() === name.toLowerCase() &&
        account.id !== excludeId,
    );

    if (duplicateAccount) {
      throw new BusinessError(`Account "${name}" already exists`);
    }
  }
}
