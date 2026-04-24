import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { Transaction } from "../models/transaction";
import { AtomicWriter } from "../ports/atomic-writer";
import { RepositoryError } from "../ports/repository-error";
import { DYNAMODB_TRANSACT_WRITE_MAX_ITEMS } from "../utils/dynamo-client";

type ExpectedTransactItem = NonNullable<
  ConstructorParameters<typeof TransactWriteCommand>[0]["TransactItems"]
>[number];

type WriteItem =
  | { Put: NonNullable<ExpectedTransactItem["Put"]> }
  | { Update: NonNullable<ExpectedTransactItem["Update"]> };

export interface TransactionWriteItemBuilder {
  buildCreateWriteItem(transaction: Readonly<Transaction>): WriteItem;
  buildUpdateWriteItem(transaction: Readonly<Transaction>): WriteItem;
}

export class DynAtomicWriter implements AtomicWriter {
  private client: DynamoDBDocumentClient;
  private transactionWriteItemBuilder: TransactionWriteItemBuilder;
  private committed = false;
  private writeItems: WriteItem[] = [];

  constructor(deps: {
    client: DynamoDBDocumentClient;
    transactionWriteItemBuilder: TransactionWriteItemBuilder;
  }) {
    this.client = deps.client;
    this.transactionWriteItemBuilder = deps.transactionWriteItemBuilder;
  }

  appendCreateTransaction(transaction: Readonly<Transaction>): void {
    this.writeItems.push(
      this.transactionWriteItemBuilder.buildCreateWriteItem(transaction),
    );
  }

  appendUpdateTransaction(transaction: Readonly<Transaction>): void {
    this.writeItems.push(
      this.transactionWriteItemBuilder.buildUpdateWriteItem(transaction),
    );
  }

  async commit(): Promise<void> {
    if (this.committed) {
      throw new RepositoryError("Already committed", "INVALID_COMMIT");
    }

    if (this.writeItems.length === 0) {
      throw new RepositoryError("Nothing to commit", "INVALID_COMMIT");
    }

    if (this.writeItems.length > DYNAMODB_TRANSACT_WRITE_MAX_ITEMS) {
      throw new RepositoryError(
        `Exceeds DynamoDB TransactWrite max items (${DYNAMODB_TRANSACT_WRITE_MAX_ITEMS})`,
        "INVALID_COMMIT",
      );
    }

    const command = new TransactWriteCommand({
      TransactItems: this.writeItems,
    });

    await this.client.send(command);
    this.committed = true;
  }
}
