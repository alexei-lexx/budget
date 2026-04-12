import { randomUUID } from "crypto";
import { Account } from "../models/account";
import { Transaction, TransactionType } from "../models/transaction";
import { AccountRepository } from "../ports/account-repository";
import {
  CreateTransactionInput,
  TransactionRepository,
} from "../ports/transaction-repository";
import { DateString } from "../types/date";
import { DESCRIPTION_MAX_LENGTH } from "../types/validation";
import { BusinessError } from "./business-error";

/**
 * Input type for creating transfers between accounts
 */
export interface CreateTransferServiceInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: DateString;
  description?: string | null;
}

/**
 * Input type for updating transfers between accounts
 */
export interface UpdateTransferServiceInput {
  fromAccountId?: string;
  toAccountId?: string;
  amount?: number;
  date?: DateString;
  description?: string | null;
}

/**
 * Result type for transfer operations
 */
export interface TransferResult {
  transferId: string;
  outboundTransaction: Transaction;
  inboundTransaction: Transaction;
}

/**
 * Transfer service class for handling account-to-account transfers
 * Implements the service layer pattern for transfer operations
 */
export class TransferService {
  constructor(
    private transactionRepository: TransactionRepository,
    private accountRepository: AccountRepository,
  ) {}

  /**
   * Get a transfer by ID with its paired transactions
   * @param transferId - The transfer ID to retrieve
   * @param userId - The user ID owning the transfer
   * @returns Promise<TransferResult | undefined> - The transfer result or undefined if not found
   * @throws BusinessError if the transfer is in an invalid state
   */
  async getTransfer(
    transferId: string,
    userId: string,
  ): Promise<TransferResult | undefined> {
    return this.fetchValidatedTransfer(transferId, userId);
  }

  /**
   * Create a transfer between two accounts
   * Creates two linked transactions: TRANSFER_OUT from source, TRANSFER_IN to destination
   * @param input - Transfer creation input
   * @param userId - The user ID creating the transfer
   * @returns Promise<TransferResult> - The created transfer with ID and transaction pair
   * @throws BusinessError for any business rule violations
   */
  async createTransfer(
    input: CreateTransferServiceInput,
    userId: string,
  ): Promise<TransferResult> {
    // Validate input parameters
    this.validateAmount(input.amount);
    this.validateDescription(input.description);

    // Validate not transferring to the same account (fail fast before DB calls)
    this.validateNotSelfTransfer(input.fromAccountId, input.toAccountId);

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
      type: TransactionType.TRANSFER_OUT,
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
      type: TransactionType.TRANSFER_IN,
      amount: input.amount,
      currency: toAccount.currency, // Should be same as fromAccount.currency due to validation
      date: input.date,
      description: input.description || undefined,
      transferId,
    };

    try {
      // Create both transactions atomically using DynamoDB transaction
      // TransactWriteCommand guarantees either both succeed or both fail
      const transactions = await this.transactionRepository.createMany([
        outboundInput,
        inboundInput,
      ]);

      // Return the transfer result with ID and transactions
      return {
        transferId,
        outboundTransaction: transactions[0],
        inboundTransaction: transactions[1],
      };
    } catch (error) {
      // Log the error for debugging and monitoring
      console.error("Transfer creation failed:", {
        transferId,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount: input.amount,
        error,
      });

      throw new BusinessError("Failed to create transfer transactions");
    }
  }

  /**
   * Delete a transfer by removing both paired transactions
   * @param transferId - The transfer ID to delete
   * @param userId - The user ID requesting the deletion
   * @returns Promise<void>
   * @throws BusinessError if transfer not found or doesn't belong to user
   */
  async deleteTransfer(transferId: string, userId: string): Promise<void> {
    // Find the paired transactions for this transfer
    const transferTransactions =
      await this.transactionRepository.findManyByTransferId({
        transferId,
        userId,
      });

    // Validate transfer exists
    if (transferTransactions.length === 0) {
      throw new BusinessError("Transfer not found or doesn't belong to user");
    }

    try {
      // Archive all transactions for this transfer atomically using TransactWrite
      await this.transactionRepository.archiveMany({
        ids: transferTransactions.map((transaction) => transaction.id),
        userId,
      });
    } catch (error) {
      // Log the error for debugging and monitoring
      console.error("Transfer deletion failed:", {
        transferId,
        userId,
        transactionIds: transferTransactions.map((t) => t.id),
        error,
      });

      throw new BusinessError("Failed to delete transfer transactions");
    }
  }

  /**
   * Update a transfer by modifying both paired transactions atomically
   * @param transferId - The transfer ID to update
   * @param userId - The user ID requesting the update
   * @param input - Transfer update input
   * @returns Promise<TransferResult> - The updated transfer with ID and transaction pair
   * @throws BusinessError for any business rule violations
   */
  async updateTransfer(
    transferId: string,
    userId: string,
    input: UpdateTransferServiceInput,
  ): Promise<TransferResult> {
    // Validate input parameters before any DB calls
    if (input.amount !== undefined) {
      this.validateAmount(input.amount);
    }
    this.validateDescription(input.description);

    // Find and validate the existing transfer
    const existingTransfer = await this.fetchValidatedTransfer(
      transferId,
      userId,
    );

    if (!existingTransfer) {
      throw new BusinessError("Transfer not found or doesn't belong to user");
    }

    const { outboundTransaction, inboundTransaction } = existingTransfer;

    // Merge input with existing values for partial updates
    const fromAccountId = input.fromAccountId ?? outboundTransaction.accountId;
    const toAccountId = input.toAccountId ?? inboundTransaction.accountId;
    const amount = input.amount ?? outboundTransaction.amount;
    const date = input.date ?? outboundTransaction.date;
    // Note: Can't use ?? for description because we need to distinguish:
    // - undefined = "field not provided" (keep existing value)
    // - null = "field explicitly set to null" (clear the description)
    const description =
      input.description !== undefined
        ? input.description
        : outboundTransaction.description;

    // Validate not transferring to the same account (fail fast before DB calls)
    this.validateNotSelfTransfer(fromAccountId, toAccountId);

    // Validate both accounts exist and belong to user
    const fromAccount = await this.validateAccount(fromAccountId, userId);
    const toAccount = await this.validateAccount(toAccountId, userId);

    // Validate accounts have the same currency
    this.validateCurrencyMatch(fromAccount, toAccount);

    try {
      // Update both transactions atomically using the new updateMany method
      const updates = [
        {
          id: outboundTransaction.id,
          input: {
            accountId: fromAccountId,
            amount: amount,
            currency: fromAccount.currency,
            date: date,
            description: description || undefined, // Convert null to undefined for repository layer
            // Note: transferId is intentionally not included as it cannot be changed
          },
        },
        {
          id: inboundTransaction.id,
          input: {
            accountId: toAccountId,
            amount: amount,
            currency: toAccount.currency, // Should be same as fromAccount.currency due to validation
            date: date,
            description: description || undefined,
            // Note: transferId is intentionally not included as it cannot be changed
          },
        },
      ];

      await this.transactionRepository.updateMany(updates, userId);

      // Fetch and return the updated transfer
      const updatedTransfer = await this.fetchValidatedTransfer(
        transferId,
        userId,
      );

      if (!updatedTransfer) {
        throw new BusinessError(
          "Failed to retrieve updated transfer transactions",
        );
      }

      return updatedTransfer;
    } catch (error) {
      // Log the error for debugging and monitoring
      console.error("Transfer update failed:", {
        transferId,
        fromAccountId: fromAccountId,
        toAccountId: toAccountId,
        amount: amount,
        error,
      });

      throw new BusinessError("Failed to update transfer transactions");
    }
  }

  private async fetchValidatedTransfer(
    transferId: string,
    userId: string,
  ): Promise<TransferResult | undefined> {
    const transferTransactions =
      await this.transactionRepository.findManyByTransferId({
        transferId,
        userId,
      });

    if (transferTransactions.length === 0) {
      return undefined;
    }

    if (transferTransactions.length !== 2) {
      throw new BusinessError(
        `Invalid transfer state: expected 2 transactions, found ${transferTransactions.length}`,
      );
    }

    const outboundTransaction = transferTransactions.find(
      (transaction) => transaction.type === TransactionType.TRANSFER_OUT,
    );
    const inboundTransaction = transferTransactions.find(
      (transaction) => transaction.type === TransactionType.TRANSFER_IN,
    );

    if (!outboundTransaction) {
      throw new BusinessError(
        "Invalid transfer state: missing TRANSFER_OUT transaction",
      );
    }

    if (!inboundTransaction) {
      throw new BusinessError(
        "Invalid transfer state: missing TRANSFER_IN transaction",
      );
    }

    return { transferId, outboundTransaction, inboundTransaction };
  }

  /**
   * Validate that the description does not exceed the maximum allowed length
   * @param description - The description to validate (null/undefined are allowed)
   * @throws BusinessError if description exceeds maximum length
   */
  private validateDescription(description?: string | null): void {
    if (description && description.length > DESCRIPTION_MAX_LENGTH) {
      throw new BusinessError(
        `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
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
    const account = await this.accountRepository.findOneById({
      id: accountId,
      userId,
    });

    if (!account) {
      throw new BusinessError("Account not found or doesn't belong to user");
    }

    return account;
  }

  /**
   * Validate that the transfer amount is valid (positive)
   * @param amount - The amount to validate
   * @throws BusinessError if amount is not positive
   */
  private validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new BusinessError("Transfer amount must be positive");
    }
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
      );
    }
  }

  /**
   * Validate that the transfer is not to the same account (self-transfer)
   * @param fromAccountId - The source account ID
   * @param toAccountId - The destination account ID
   * @throws BusinessError if attempting to transfer to the same account
   */
  private validateNotSelfTransfer(
    fromAccountId: string,
    toAccountId: string,
  ): void {
    if (fromAccountId === toAccountId) {
      throw new BusinessError("Cannot transfer money to the same account");
    }
  }
}
