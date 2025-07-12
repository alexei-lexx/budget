import { randomUUID } from "crypto";
import { BusinessError, BusinessErrorCodes } from "./BusinessError";
import {
  ITransactionRepository,
  Transaction,
  CreateTransactionInput,
} from "../models/Transaction";
import { IAccountRepository, Account } from "../models/Account";

/**
 * Input type for creating transfers between accounts
 */
export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string | null;
}

/**
 * Transfer service class for handling account-to-account transfers
 * Implements the service layer pattern for transfer operations
 */
export class TransferService {
  constructor(
    private transactionRepository: ITransactionRepository,
    private accountRepository: IAccountRepository,
  ) { }

  /**
   * Create a transfer between two accounts
   * Creates two linked transactions: TRANSFER_OUT from source, TRANSFER_IN to destination
   * @param input - Transfer creation input
   * @param userId - The user ID creating the transfer
   * @returns Promise<[Transaction, Transaction]> - The created transaction pair [outbound, inbound]
   * @throws BusinessError for any business rule violations
   */
  async createTransfer(
    input: CreateTransferInput,
    userId: string,
  ): Promise<[Transaction, Transaction]> {
    // Validate input parameters
    this.validateAmount(input.amount);
    this.validateDate(input.date);

    // Validate both accounts exist and belong to user
    const fromAccount = await this.validateAccount(input.fromAccountId, userId);
    const toAccount = await this.validateAccount(input.toAccountId, userId);

    // Validate accounts have the same currency
    this.validateCurrencyMatch(fromAccount, toAccount);

    // Generate a unique transfer ID to link the two transactions
    const transferId = randomUUID();

    // Create the outbound transaction (TRANSFER_OUT)
    const outboundInput: CreateTransactionInput = {
      userId,
      accountId: input.fromAccountId,
      type: "TRANSFER_OUT",
      amount: input.amount,
      currency: fromAccount.currency,
      date: input.date,
      description: input.description || undefined,
      transferId,
    };

    // Create the inbound transaction (TRANSFER_IN)
    const inboundInput: CreateTransactionInput = {
      userId,
      accountId: input.toAccountId,
      type: "TRANSFER_IN",
      amount: input.amount,
      currency: toAccount.currency, // Should be same as fromAccount.currency due to validation
      date: input.date,
      description: input.description || undefined,
      transferId,
    };

    try {
      // Create both transactions atomically using DynamoDB transaction
      const transactions = await this.transactionRepository.createMany([
        outboundInput,
        inboundInput,
      ]);

      // Return the transactions in the expected order [outbound, inbound]
      return [transactions[0], transactions[1]];
    } catch (error) {
      throw new BusinessError(
        "Failed to create transfer transactions",
        "TRANSFER_CREATION_FAILED",
        {
          transferId,
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          amount: input.amount,
          originalError: error,
        },
      );
    }
  }

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
   * Validate that both accounts have the same currency
   * @param fromAccount - The source account
   * @param toAccount - The destination account
   * @throws BusinessError if currencies don't match
   */
  private validateCurrencyMatch(
    fromAccount: Account,
    toAccount: Account,
  ): void {
    if (fromAccount.currency !== toAccount.currency) {
      throw new BusinessError(
        `Cannot transfer between accounts with different currencies. Source account uses ${fromAccount.currency}, destination account uses ${toAccount.currency}`,
        BusinessErrorCodes.CURRENCY_MISMATCH,
        {
          fromAccountCurrency: fromAccount.currency,
          toAccountCurrency: toAccount.currency,
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          fromAccountName: fromAccount.name,
          toAccountName: toAccount.name,
        },
      );
    }
  }

  /**
   * Validate that the transfer amount is valid (positive)
   * @param amount - The amount to validate
   * @throws BusinessError if amount is not positive
   */
  private validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new BusinessError(
        "Transfer amount must be positive",
        BusinessErrorCodes.INVALID_AMOUNT,
        { amount },
      );
    }
  }

  /**
   * Validate that the transfer date is in the correct format (YYYY-MM-DD)
   * @param date - The date string to validate
   * @throws BusinessError if date format is invalid
   */
  private validateDate(date: string): void {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new BusinessError(
        "Transfer date must be in YYYY-MM-DD format",
        BusinessErrorCodes.INVALID_DATE,
        { date },
      );
    }
  }


}
