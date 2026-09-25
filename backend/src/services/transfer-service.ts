import { randomUUID } from "crypto";
import { Account } from "../models/account";
import { Transaction } from "../models/transaction";
import { AccountRepository } from "../ports/account-repository";
import { AtomicWriter } from "../ports/atomic-writer";
import { TransactionRepository } from "../ports/transaction-repository";
import { DateString } from "../types/date-string";
import { Failure, Result, Success } from "../types/result";

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
  private accountRepository: AccountRepository;
  private transactionRepository: TransactionRepository;
  private atomicWriter: AtomicWriter;

  constructor(deps: {
    accountRepository: AccountRepository;
    transactionRepository: TransactionRepository;
    atomicWriter: AtomicWriter;
  }) {
    this.accountRepository = deps.accountRepository;
    this.transactionRepository = deps.transactionRepository;
    this.atomicWriter = deps.atomicWriter;
  }

  /**
   * Get a transfer by ID with its paired transactions
   * @param transferId - The transfer ID to retrieve
   * @param userId - The user ID owning the transfer
   * @returns The transfer result (undefined if not found), or a failure reason
   */
  async getTransfer(
    transferId: string,
    userId: string,
  ): Promise<Result<TransferResult | undefined, string>> {
    return this.fetchValidatedTransfer(transferId, userId);
  }

  /**
   * Create a transfer between two accounts
   * Creates two linked transactions: TRANSFER_OUT from source, TRANSFER_IN to destination
   * @param input - Transfer creation input
   * @param userId - The user ID creating the transfer
   * @returns The created transfer with ID and transaction pair, or a failure reason
   */
  async createTransfer(
    input: CreateTransferServiceInput,
    userId: string,
  ): Promise<Result<TransferResult, string>> {
    // Validate not transferring to the same account (fail fast before DB calls)
    const selfTransferCheck = this.validateNotSelfTransfer(
      input.fromAccountId,
      input.toAccountId,
    );
    if (!selfTransferCheck.success) {
      return selfTransferCheck;
    }

    // Validate both accounts exist and belong to user
    const sourceAccountResult = await this.ensureActiveAccount(
      input.fromAccountId,
      userId,
    );
    if (!sourceAccountResult.success) {
      return sourceAccountResult;
    }
    const sourceAccount = sourceAccountResult.data;

    const destAccountResult = await this.ensureActiveAccount(
      input.toAccountId,
      userId,
    );
    if (!destAccountResult.success) {
      return destAccountResult;
    }
    const destAccount = destAccountResult.data;

    // Validate accounts have the same currency
    const currencyCheck = this.validateCurrencyMatch(
      sourceAccount,
      destAccount,
    );
    if (!currencyCheck.success) {
      return currencyCheck;
    }

    // Generate a unique transfer ID to link the two transactions
    const transferId = randomUUID();

    // Build the outbound transaction (TRANSFER_OUT)
    const outboundTransaction = Transaction.create({
      userId,
      account: sourceAccount,
      type: "TRANSFER_OUT",
      amount: input.amount,
      date: input.date,
      description: input.description || undefined,
      transferId,
    });

    // Build the inbound transaction (TRANSFER_IN)
    const inboundTransaction = Transaction.create({
      userId,
      account: destAccount,
      type: "TRANSFER_IN",
      amount: input.amount,
      date: input.date,
      description: input.description || undefined,
      transferId,
    });

    const sourceAccountToUpdate = sourceAccount.increaseBalanceBySignedAmount(
      outboundTransaction.signedAmount,
    );
    const destAccountToUpdate = destAccount.increaseBalanceBySignedAmount(
      inboundTransaction.signedAmount,
    );

    try {
      await this.atomicWriter.commit({
        transactionsToCreate: [outboundTransaction, inboundTransaction],
        accountsToUpdate: [sourceAccountToUpdate, destAccountToUpdate],
      });

      return Success({
        transferId,
        outboundTransaction,
        inboundTransaction,
      });
    } catch (error) {
      console.error("Transfer creation failed:", {
        transferId,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount: input.amount,
        error,
      });

      return Failure("Failed to create transfer transactions");
    }
  }

  /**
   * Delete a transfer by removing both paired transactions
   * @param transferId - The transfer ID to delete
   * @param userId - The user ID requesting the deletion
   * @returns Success, or a failure reason if the transfer wasn't found or couldn't be deleted
   */
  async deleteTransfer(
    transferId: string,
    userId: string,
  ): Promise<Result<void, string>> {
    // Find the paired transactions for this transfer
    const transferTransactions =
      await this.transactionRepository.findManyByTransferId({
        transferId,
        userId,
      });

    // Validate transfer exists
    if (transferTransactions.length === 0) {
      return Failure("Transfer not found or doesn't belong to user");
    }

    const outboundTransaction = transferTransactions.find(
      (transaction) => transaction.type === "TRANSFER_OUT",
    );
    const inboundTransaction = transferTransactions.find(
      (transaction) => transaction.type === "TRANSFER_IN",
    );
    if (!outboundTransaction || !inboundTransaction) {
      return Failure("Invalid transfer state: missing pair");
    }

    const sourceAccount = await this.accountRepository.findOneWithArchivedById({
      id: outboundTransaction.accountId,
      userId,
    });
    const destAccount = await this.accountRepository.findOneWithArchivedById({
      id: inboundTransaction.accountId,
      userId,
    });
    if (!sourceAccount || !destAccount) {
      return Failure("Account not found");
    }

    const outboundTransactionToArchive = outboundTransaction.archive();
    const inboundTransactionToArchive = inboundTransaction.archive();

    const sourceAccountToUpdate = sourceAccount.decreaseBalanceBySignedAmount(
      outboundTransaction.signedAmount,
    );
    const destAccountToUpdate = destAccount.decreaseBalanceBySignedAmount(
      inboundTransaction.signedAmount,
    );

    try {
      await this.atomicWriter.commit({
        transactionsToUpdate: [
          outboundTransactionToArchive,
          inboundTransactionToArchive,
        ],
        accountsToUpdate: [sourceAccountToUpdate, destAccountToUpdate],
      });

      return Success(undefined);
    } catch (error) {
      console.error("Transfer deletion failed:", {
        transferId,
        userId,
        transactionIds: [outboundTransaction.id, inboundTransaction.id],
        error,
      });

      return Failure("Failed to delete transfer transactions");
    }
  }

  /**
   * Update a transfer by modifying both paired transactions atomically
   * @param transferId - The transfer ID to update
   * @param userId - The user ID requesting the update
   * @param input - Transfer update input
   * @returns The updated transfer with ID and transaction pair, or a failure reason
   */
  async updateTransfer(
    transferId: string,
    userId: string,
    input: UpdateTransferServiceInput,
  ): Promise<Result<TransferResult, string>> {
    // Find and validate the existing transfer
    const existingTransferResult = await this.fetchValidatedTransfer(
      transferId,
      userId,
    );
    if (!existingTransferResult.success) {
      return existingTransferResult;
    }

    const existingTransfer = existingTransferResult.data;
    if (!existingTransfer) {
      return Failure("Transfer not found or doesn't belong to user");
    }

    const { outboundTransaction, inboundTransaction } = existingTransfer;

    // After change, source and destination accounts cannot be the same
    const selfTransferCheck = this.validateNotSelfTransfer(
      input.fromAccountId ?? outboundTransaction.accountId,
      input.toAccountId ?? inboundTransaction.accountId,
    );
    if (!selfTransferCheck.success) {
      return selfTransferCheck;
    }

    const oldSourceAccount =
      await this.accountRepository.findOneWithArchivedById({
        id: outboundTransaction.accountId,
        userId,
      });

    if (!oldSourceAccount) {
      return Failure("Account not found or doesn't belong to user");
    }

    const oldDestAccount = await this.accountRepository.findOneWithArchivedById(
      {
        id: inboundTransaction.accountId,
        userId,
      },
    );

    if (!oldDestAccount) {
      return Failure("Account not found or doesn't belong to user");
    }

    let newSourceAccount = oldSourceAccount;
    if (input.fromAccountId) {
      const newSourceAccountResult = await this.ensureActiveAccount(
        input.fromAccountId,
        userId,
      );
      if (!newSourceAccountResult.success) {
        return newSourceAccountResult;
      }
      newSourceAccount = newSourceAccountResult.data;
    }

    let newDestAccount = oldDestAccount;
    if (input.toAccountId) {
      const newDestAccountResult = await this.ensureActiveAccount(
        input.toAccountId,
        userId,
      );
      if (!newDestAccountResult.success) {
        return newDestAccountResult;
      }
      newDestAccount = newDestAccountResult.data;
    }

    // Validate accounts have the same currency
    const currencyCheck = this.validateCurrencyMatch(
      newSourceAccount,
      newDestAccount,
    );
    if (!currencyCheck.success) {
      return currencyCheck;
    }

    const sharedUpdate = {
      amount: input.amount,
      date: input.date,
      description: input.description,
    };

    const outboundTransactionToUpdate = outboundTransaction.update({
      ...sharedUpdate,
      account: input.fromAccountId ? newSourceAccount : undefined,
    });

    const inboundTransactionToUpdate = inboundTransaction.update({
      ...sharedUpdate,
      account: input.toAccountId ? newDestAccount : undefined,
    });

    const balanceAffected =
      // Amount changed
      outboundTransaction.amount !== outboundTransactionToUpdate.amount ||
      // Source account changed
      oldSourceAccount !== newSourceAccount ||
      // Destination account changed
      oldDestAccount !== newDestAccount;

    // Use a map to deduplicate accounts in case of overlaps
    const accountsToUpdate = new Map<string, Account>();

    if (balanceAffected) {
      // Process outbound transaction account adjustments
      if (oldSourceAccount === newSourceAccount) {
        // Same source account, adjust by difference in amount
        const sourceAccountToUpdate = oldSourceAccount
          .decreaseBalanceBySignedAmount(outboundTransaction.signedAmount)
          .increaseBalanceBySignedAmount(
            outboundTransactionToUpdate.signedAmount,
          );

        accountsToUpdate.set(sourceAccountToUpdate.id, sourceAccountToUpdate);
      } else {
        // Different source account, adjust old and new source accounts
        const oldSourceAccountToUpdate =
          oldSourceAccount.decreaseBalanceBySignedAmount(
            outboundTransaction.signedAmount,
          );

        const newSourceAccountToUpdate =
          newSourceAccount.increaseBalanceBySignedAmount(
            outboundTransactionToUpdate.signedAmount,
          );

        accountsToUpdate
          .set(oldSourceAccountToUpdate.id, oldSourceAccountToUpdate)
          .set(newSourceAccountToUpdate.id, newSourceAccountToUpdate);
      }

      // Process inbound transaction account adjustments
      if (oldDestAccount === newDestAccount) {
        // Same destination account, adjust by difference in amount
        const destAccountToUpdate = (
          accountsToUpdate.get(oldDestAccount.id) ?? oldDestAccount
        )
          .decreaseBalanceBySignedAmount(inboundTransaction.signedAmount)
          .increaseBalanceBySignedAmount(
            inboundTransactionToUpdate.signedAmount,
          );

        accountsToUpdate.set(destAccountToUpdate.id, destAccountToUpdate);
      } else {
        // Different destination account, adjust old and new destination accounts
        const oldDestAccountToUpdate = (
          accountsToUpdate.get(oldDestAccount.id) ?? oldDestAccount
        ).decreaseBalanceBySignedAmount(inboundTransaction.signedAmount);

        const newDestAccountToUpdate = (
          accountsToUpdate.get(newDestAccount.id) ?? newDestAccount
        ).increaseBalanceBySignedAmount(
          inboundTransactionToUpdate.signedAmount,
        );

        accountsToUpdate
          .set(oldDestAccountToUpdate.id, oldDestAccountToUpdate)
          .set(newDestAccountToUpdate.id, newDestAccountToUpdate);
      }
    }

    try {
      await this.atomicWriter.commit({
        transactionsToUpdate: [
          outboundTransactionToUpdate,
          inboundTransactionToUpdate,
        ],
        accountsToUpdate: Array.from(accountsToUpdate.values()),
      });

      return Success({
        transferId,
        outboundTransaction: outboundTransactionToUpdate.bumpVersion(),
        inboundTransaction: inboundTransactionToUpdate.bumpVersion(),
      });
    } catch (error) {
      console.error("Transfer update failed:", {
        transferId,
        amount: input.amount,
        error,
      });

      return Failure("Failed to update transfer transactions");
    }
  }

  private async fetchValidatedTransfer(
    transferId: string,
    userId: string,
  ): Promise<Result<TransferResult | undefined, string>> {
    const transferTransactions =
      await this.transactionRepository.findManyByTransferId({
        transferId,
        userId,
      });

    if (transferTransactions.length === 0) {
      return Success(undefined);
    }

    if (transferTransactions.length !== 2) {
      return Failure(
        `Invalid transfer state: expected 2 transactions, found ${transferTransactions.length}`,
      );
    }

    const outboundTransaction = transferTransactions.find(
      (transaction) => transaction.type === "TRANSFER_OUT",
    );
    const inboundTransaction = transferTransactions.find(
      (transaction) => transaction.type === "TRANSFER_IN",
    );

    if (!outboundTransaction) {
      return Failure(
        "Invalid transfer state: missing TRANSFER_OUT transaction",
      );
    }

    if (!inboundTransaction) {
      return Failure("Invalid transfer state: missing TRANSFER_IN transaction");
    }

    return Success({ transferId, outboundTransaction, inboundTransaction });
  }

  /**
   * Validate that an account exists and belongs to the user
   * @param accountId - The account ID to validate
   * @param userId - The user ID to check ownership
   * @returns The validated account, or a failure reason
   */
  private async ensureActiveAccount(
    accountId: string,
    userId: string,
  ): Promise<Result<Account, string>> {
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
   * Validate that both accounts have the same currency
   * @param fromAccount - The source account
   * @param toAccount - The destination account
   * @returns Success, or a failure reason if currencies don't match
   */
  private validateCurrencyMatch(
    fromAccount: Account,
    toAccount: Account,
  ): Result<void, string> {
    if (fromAccount.currency !== toAccount.currency) {
      return Failure(
        `Cannot transfer between accounts with different currencies. Source account uses ${fromAccount.currency}, destination account uses ${toAccount.currency}`,
      );
    }

    return Success(undefined);
  }

  /**
   * Validate that the transfer is not to the same account (self-transfer)
   * @param fromAccountId - The source account ID
   * @param toAccountId - The destination account ID
   * @returns Success, or a failure reason if attempting to transfer to the same account
   */
  private validateNotSelfTransfer(
    fromAccountId: string,
    toAccountId: string,
  ): Result<void, string> {
    if (fromAccountId === toAccountId) {
      return Failure("Cannot transfer money to the same account");
    }

    return Success(undefined);
  }
}
