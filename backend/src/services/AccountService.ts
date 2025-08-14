import { BusinessError, BusinessErrorCodes } from "./BusinessError";
import { IAccountRepository } from "../models/Account";
import { ITransactionRepository, TransactionType } from "../models/Transaction";

/**
 * Account service class for handling business logic and cross-repository operations
 * Implements the service layer pattern for account operations
 */
export class AccountService {
  constructor(
    private accountRepository: IAccountRepository,
    private transactionRepository: ITransactionRepository,
  ) {}

  /**
   * Calculate the current balance for an account based on its initial balance and transaction history
   * Formula: initialBalance + INCOME transactions - EXPENSE transactions
   * @param accountId - The account ID to calculate balance for
   * @param userId - The user ID to verify ownership and scope queries
   * @returns Promise<number> - The calculated current balance
   * @throws BusinessError if account not found or calculation fails
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

    try {
      // Get all transactions for this account
      const transactions = await this.transactionRepository.findByAccountId(
        accountId,
        userId,
      );

      // Calculate balance: initialBalance + INCOME + TRANSFER_IN - EXPENSE - TRANSFER_OUT
      const balance = transactions.reduce((sum, transaction) => {
        if (
          transaction.type === TransactionType.INCOME ||
          transaction.type === TransactionType.TRANSFER_IN
        ) {
          return sum + transaction.amount;
        } else if (
          transaction.type === TransactionType.EXPENSE ||
          transaction.type === TransactionType.TRANSFER_OUT
        ) {
          return sum - transaction.amount;
        }
        return sum;
      }, account.initialBalance);

      return balance;
    } catch (error) {
      throw new BusinessError(
        "Failed to calculate account balance",
        "BALANCE_CALCULATION_FAILED",
        { accountId, userId, originalError: error },
      );
    }
  }
}
