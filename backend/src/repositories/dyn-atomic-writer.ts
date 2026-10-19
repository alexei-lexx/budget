import {
  DynamoDBClient,
  TransactionCanceledException,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { Account } from "../models/account";
import { Transaction } from "../models/transaction";
import {
  AtomicWriteOutput,
  AtomicWriter,
  AtomicWriterInput,
} from "../ports/atomic-writer";
import { Logger } from "../ports/logger";
import {
  RepositoryError,
  VersionConflictError,
} from "../ports/repository-error";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { buildUpdateAccountItem } from "./dyn-account-repository";
import {
  buildCreateTransactionItem,
  buildUpdateTransactionItem,
} from "./dyn-transaction-repository";

export class DynAtomicWriter implements AtomicWriter {
  private readonly client: DynamoDBDocumentClient;
  private readonly accountsTableName: string;
  private readonly transactionsTableName: string;
  private readonly logger: Logger;

  constructor(args: {
    accountsTableName: string;
    dynamoClient?: DynamoDBClient;
    logger: Logger;
    transactionsTableName: string;
  }) {
    if (!args.accountsTableName) {
      throw new RepositoryError("accountsTableName is required");
    }
    if (!args.transactionsTableName) {
      throw new RepositoryError("transactionsTableName is required");
    }
    this.client = createDynamoDBDocumentClient(args.dynamoClient);
    this.accountsTableName = args.accountsTableName;
    this.transactionsTableName = args.transactionsTableName;
    this.logger = args.logger;
  }

  async commit(write: AtomicWriterInput): Promise<AtomicWriteOutput> {
    const transactionsToCreate: readonly Transaction[] =
      write.transactionsToCreate ?? [];
    const transactionsToUpdate: readonly Transaction[] =
      write.transactionsToUpdate ?? [];
    const accountsToUpdate: readonly Account[] = write.accountsToUpdate ?? [];

    const transactItems = [
      ...transactionsToCreate.map((transaction) =>
        buildCreateTransactionItem(transaction, this.transactionsTableName),
      ),
      ...transactionsToUpdate.map((transaction) =>
        buildUpdateTransactionItem(transaction, this.transactionsTableName),
      ),
      ...accountsToUpdate.map((account) =>
        buildUpdateAccountItem(account, this.accountsTableName),
      ),
    ];

    if (transactItems.length === 0) {
      throw new RepositoryError("Nothing to commit");
    }

    try {
      await this.client.send(
        new TransactWriteCommand({ TransactItems: transactItems }),
      );
    } catch (error) {
      if (error instanceof TransactionCanceledException) {
        const reasons = error.CancellationReasons ?? [];

        // Conditional-check failure with returned Item ⇒ version conflict.
        const hasVersionConflict = reasons.some(
          (reason) =>
            reason.Code === "ConditionalCheckFailed" &&
            reason.Item !== undefined,
        );

        if (hasVersionConflict) {
          throw new VersionConflictError(error);
        }

        // No-Item conditional failure ⇒ missing row (Update) or duplicate id (Put).
        const hasFailure = reasons.some(
          (reason) =>
            reason.Code === "ConditionalCheckFailed" &&
            reason.Item === undefined,
        );

        if (hasFailure) {
          throw new RepositoryError(
            "Transaction or account row was missing or already existed",
            error,
          );
        }
      }

      this.logger.error("LedgerWriter TransactWrite failed:", error);

      throw new RepositoryError("Failed to apply ledger write", error);
    }

    const createdTransactions = transactionsToCreate;
    const updatedTransactions = transactionsToUpdate.map((transaction) =>
      transaction.bumpVersion(),
    );
    const updatedAccounts = accountsToUpdate.map((account) =>
      account.bumpVersion(),
    );

    return {
      createdTransactions,
      updatedTransactions,
      updatedAccounts,
    };
  }
}
