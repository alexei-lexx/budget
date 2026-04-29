import { beforeAll, describe, expect, it } from "@jest/globals";
import { VersionConflictError } from "../ports/repository-error";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { DynAccountRepository } from "./dyn-account-repository";
import { DynAtomicWriter } from "./dyn-atomic-writer";
import { DynTransactionRepository } from "./dyn-transaction-repository";

describe("DynAtomicWriter", () => {
  let writer: DynAtomicWriter;
  let accountRepository: DynAccountRepository;
  let transactionRepository: DynTransactionRepository;
  const accountsTableName = requireEnv("ACCOUNTS_TABLE_NAME");
  const transactionsTableName = requireEnv("TRANSACTIONS_TABLE_NAME");
  const client = createDynamoDBDocumentClient();

  beforeAll(() => {
    accountRepository = new DynAccountRepository(accountsTableName, client);
    transactionRepository = new DynTransactionRepository(
      transactionsTableName,
      client,
    );
    writer = new DynAtomicWriter({
      accountsTableName,
      transactionsTableName,
    });
  });

  describe("commit", () => {
    // Happy path

    it("persists batch atomically", async () => {
      // Arrange
      const newTransaction = fakeTransaction();

      const existingTransaction = fakeTransaction();
      await transactionRepository.create(existingTransaction);

      const existingAccount = fakeAccount();
      await accountRepository.create(existingAccount);

      // Act
      const result = await writer.commit({
        transactionsToCreate: [newTransaction],
        transactionsToUpdate: [existingTransaction],
        accountsToUpdate: [existingAccount],
      });

      // Assert
      expect(result.createdTransactions[0]?.toData()).toEqual(
        newTransaction.toData(),
      );

      expect(result.updatedTransactions[0]?.toData()).toEqual({
        ...existingTransaction.toData(),
        version: existingTransaction.version + 1,
      });

      expect(result.updatedAccounts[0]?.toData()).toEqual({
        ...existingAccount.toData(),
        version: existingAccount.version + 1,
      });

      const persistedNewTransaction = await transactionRepository.findOneById({
        id: newTransaction.id,
        userId: newTransaction.userId,
      });
      expect(persistedNewTransaction?.toData()).toEqual(
        newTransaction.toData(),
      );

      const persistedEditedTransaction =
        await transactionRepository.findOneById({
          id: existingTransaction.id,
          userId: existingTransaction.userId,
        });
      expect(persistedEditedTransaction?.toData()).toEqual(
        result.updatedTransactions[0]?.toData(),
      );

      const persistedAccount = await accountRepository.findOneById({
        id: existingAccount.id,
        userId: existingAccount.userId,
      });
      expect(persistedAccount?.toData()).toEqual(
        result.updatedAccounts[0]?.toData(),
      );
    });

    // Validation failures

    it("throws when called with no items", async () => {
      // Act & Assert
      await expect(
        writer.commit({
          transactionsToCreate: [],
          transactionsToUpdate: [],
          accountsToUpdate: [],
        }),
      ).rejects.toMatchObject({
        name: "RepositoryError",
        code: "INVALID_PARAMETERS",
        message: "Nothing to commit",
      });
    });

    // Dependency failures

    it("rolls back whole batch when version is stale", async () => {
      // Arrange
      const account = fakeAccount();
      await accountRepository.create(account);

      const transaction = fakeTransaction();
      await transactionRepository.create(transaction);

      // In the meantime, another process updates transaction — making our version stale
      const updatedTransaction =
        await transactionRepository.update(transaction);

      // Act & Assert
      await expect(
        writer.commit({
          transactionsToUpdate: [transaction],
          accountsToUpdate: [account],
        }),
      ).rejects.toBeInstanceOf(VersionConflictError);

      // Account row was NOT bumped — proves atomic rollback
      const persistedAccount = await accountRepository.findOneById({
        id: account.id,
        userId: account.userId,
      });
      expect(persistedAccount?.version).toBe(account.version);

      // Transaction row was NOT bumped a second time — proves atomic rollback
      const persistedTransaction = await transactionRepository.findOneById({
        id: transaction.id,
        userId: transaction.userId,
      });
      expect(persistedTransaction?.version).toBe(updatedTransaction.version);
    });

    it("throws when creating transaction with duplicate id", async () => {
      // Arrange
      const transaction = fakeTransaction();
      await transactionRepository.create(transaction);

      // Act & Assert
      await expect(
        writer.commit({
          transactionsToCreate: [transaction],
        }),
      ).rejects.toMatchObject({
        name: "RepositoryError",
        code: "NOT_FOUND",
        message: "Transaction or account row was missing or already existed",
      });
    });

    it("throws when updating non-existent transaction", async () => {
      // Arrange
      const transaction = fakeTransaction();

      // Act & Assert
      await expect(
        writer.commit({
          transactionsToUpdate: [transaction],
        }),
      ).rejects.toMatchObject({
        name: "RepositoryError",
        code: "NOT_FOUND",
        message: "Transaction or account row was missing or already existed",
      });
    });
  });
});
