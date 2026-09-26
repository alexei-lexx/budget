import {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from "../models/account";
import { AccountRepository } from "../ports/account-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { EntityScope } from "../types/entity-scope";
import { Failure, Result, Success } from "../types/result";

export interface AccountService {
  getAccountsByUser(
    userId: string,
    scope: EntityScope,
  ): Promise<Result<Account[]>>;
  createAccount(input: CreateAccountInput): Promise<Result<Account>>;
  updateAccount(
    id: string,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<Result<Account>>;
  deleteAccount(id: string, userId: string): Promise<Result<Account>>;
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
   * Get accounts for a user filtered by scope
   * @param userId - The user ID to get accounts for
   * @param scope - Which accounts to include (active, archived, or all)
   * @returns List of accounts matching the scope
   */
  async getAccountsByUser(
    userId: string,
    scope: EntityScope,
  ): Promise<Result<Account[]>> {
    if (scope === "ACTIVE") {
      return Success(await this.accountRepository.findManyByUserId(userId));
    }

    const accounts =
      await this.accountRepository.findManyWithArchivedByUserId(userId);

    if (scope === "ALL") {
      return Success(accounts);
    }

    return Success(accounts.filter((account) => account.isArchived));
  }

  /**
   * Create a new account for a user
   * @param input - Account creation input
   * @returns The created account, or a failure reason
   */
  async createAccount(input: CreateAccountInput): Promise<Result<Account>> {
    const account = Account.create(input);

    if (await this.isDuplicateName(account.userId, account.name)) {
      return Failure(`Account "${account.name}" already exists`);
    }

    await this.accountRepository.create(account);
    return Success(account);
  }

  /**
   * Update an account
   * Enforces business rule: cannot change currency if account has existing transactions
   * @param id - Account ID to update
   * @param userId - User ID for authorization
   * @param input - Account update input
   * @returns The updated account, or a failure reason
   */
  async updateAccount(
    id: string,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<Result<Account>> {
    // Fetch existing account
    const existingAccount = await this.accountRepository.findOneById({
      id,
      userId,
    });

    if (!existingAccount) {
      return Failure("Account not found");
    }

    const updatedAccount = existingAccount.update(input);

    // Check for duplicate names if name is being updated
    if (
      updatedAccount.name !== existingAccount.name &&
      (await this.isDuplicateName(userId, updatedAccount.name, id))
    ) {
      return Failure(`Account "${updatedAccount.name}" already exists`);
    }

    // If currency is being changed, check for existing transactions
    if (existingAccount.currency !== updatedAccount.currency) {
      const hasTransactions =
        await this.transactionRepository.hasTransactionsForAccount({
          accountId: id,
          userId,
        });

      if (hasTransactions) {
        return Failure(
          "Cannot change currency for account that has existing transactions. Please create a new account with the desired currency instead.",
        );
      }
    }

    return Success(await this.accountRepository.update(updatedAccount));
  }

  /**
   * Archive (soft-delete) an account
   * @param id - Account ID to archive
   * @param userId - User ID for authorization
   * @returns The archived account, or a failure reason
   */
  async deleteAccount(id: string, userId: string): Promise<Result<Account>> {
    const existingAccount = await this.accountRepository.findOneById({
      id,
      userId,
    });

    if (!existingAccount) {
      return Failure("Account not found");
    }

    return Success(
      await this.accountRepository.update(existingAccount.archive()),
    );
  }

  private async isDuplicateName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const existingAccounts =
      await this.accountRepository.findManyByUserId(userId);

    const duplicateAccount = existingAccounts.find(
      (account) =>
        account.name.toLowerCase() === name.toLowerCase() &&
        account.id !== excludeId,
    );

    return Boolean(duplicateAccount);
  }
}
