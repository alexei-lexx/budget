import { randomUUID } from "crypto";
import { Account } from "../models/account";
import { Transaction, TransactionType } from "../models/transaction";
import { AccountRepository } from "../ports/account-repository";
import { AtomicWriter } from "../ports/atomic-writer";
import { TransactionRepository } from "../ports/transaction-repository";
import { DateString } from "../types/date";
import { BusinessError } from "./business-error";
import { handleVersionConflict } from "./utils/handle-version-conflict";

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
    // Validate not transferring to the same account (fail fast before DB calls)
    this.validateNotSelfTransfer(input.fromAccountId, input.toAccountId);

    // Validate both accounts exist and belong to user
    const sourceAccount = await this.ensureActiveAccount(
      input.fromAccountId,
      userId,
    );
    const destAccount = await this.ensureActiveAccount(
      input.toAccountId,
      userId,
    );

    // Validate accounts have the same currency
    this.validateCurrencyMatch(sourceAccount, destAccount);

    // Generate a unique transfer ID to link the two transactions
    const transferId = randomUUID();

    // Build the outbound transaction (TRANSFER_OUT)
    const outboundTransaction = Transaction.create({
      userId,
      account: sourceAccount,
      type: TransactionType.TRANSFER_OUT,
      amount: input.amount,
      date: input.date,
      description: input.description || undefined,
      transferId,
    });

    // Build the inbound transaction (TRANSFER_IN)
    const inboundTransaction = Transaction.create({
      userId,
      account: destAccount,
      type: TransactionType.TRANSFER_IN,
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
      await handleVersionConflict("Transfer", () =>
        this.atomicWriter.commit({
          transactionsToCreate: [outboundTransaction, inboundTransaction],
          accountsToUpdate: [sourceAccountToUpdate, destAccountToUpdate],
        }),
      );

      return {
        transferId,
        outboundTransaction,
        inboundTransaction,
      };
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }

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

    const outboundTransaction = transferTransactions.find(
      (transaction) => transaction.type === TransactionType.TRANSFER_OUT,
    );
    const inboundTransaction = transferTransactions.find(
      (transaction) => transaction.type === TransactionType.TRANSFER_IN,
    );
    if (!outboundTransaction || !inboundTransaction) {
      throw new BusinessError("Invalid transfer state: missing pair");
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
      throw new BusinessError("Account not found");
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
      await handleVersionConflict("Transfer", () =>
        this.atomicWriter.commit({
          transactionsToUpdate: [
            outboundTransactionToArchive,
            inboundTransactionToArchive,
          ],
          accountsToUpdate: [sourceAccountToUpdate, destAccountToUpdate],
        }),
      );
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }

      console.error("Transfer deletion failed:", {
        transferId,
        userId,
        transactionIds: [outboundTransaction.id, inboundTransaction.id],
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
    // Find and validate the existing transfer
    const existingTransfer = await this.fetchValidatedTransfer(
      transferId,
      userId,
    );

    if (!existingTransfer) {
      throw new BusinessError("Transfer not found or doesn't belong to user");
    }

    const { outboundTransaction, inboundTransaction } = existingTransfer;

    // After change, source and destination accounts cannot be the same
    this.validateNotSelfTransfer(
      input.fromAccountId ?? outboundTransaction.accountId,
      input.toAccountId ?? inboundTransaction.accountId,
    );

    const oldSourceAccount =
      await this.accountRepository.findOneWithArchivedById({
        id: outboundTransaction.accountId,
        userId,
      });

    if (!oldSourceAccount) {
      throw new BusinessError("Account not found or doesn't belong to user");
    }

    const oldDestAccount = await this.accountRepository.findOneWithArchivedById(
      {
        id: inboundTransaction.accountId,
        userId,
      },
    );

    if (!oldDestAccount) {
      throw new BusinessError("Account not found or doesn't belong to user");
    }

    const newSourceAccount = input.fromAccountId
      ? await this.ensureActiveAccount(input.fromAccountId, userId)
      : oldSourceAccount;

    const newDestAccount = input.toAccountId
      ? await this.ensureActiveAccount(input.toAccountId, userId)
      : oldDestAccount;

    // Validate accounts have the same currency
    this.validateCurrencyMatch(newSourceAccount, newDestAccount);

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
      await handleVersionConflict("Transfer", () =>
        this.atomicWriter.commit({
          transactionsToUpdate: [
            outboundTransactionToUpdate,
            inboundTransactionToUpdate,
          ],
          accountsToUpdate: Array.from(accountsToUpdate.values()),
        }),
      );

      return {
        transferId,
        outboundTransaction: outboundTransactionToUpdate.bumpVersion(),
        inboundTransaction: inboundTransactionToUpdate.bumpVersion(),
      };
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }

      console.error("Transfer update failed:", {
        transferId,
        amount: input.amount,
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
   * Validate that an account exists and belongs to the user
   * @param accountId - The account ID to validate
   * @param userId - The user ID to check ownership
   * @returns Promise<Account> - The validated account
   * @throws BusinessError if account not found or doesn't belong to user
   */
  private async ensureActiveAccount(
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
