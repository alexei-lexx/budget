import { Transaction } from "../models/transaction";

export interface AtomicWriter {
  appendCreateTransaction(transaction: Readonly<Transaction>): void;
  appendUpdateTransaction(transaction: Readonly<Transaction>): void;
  commit(): Promise<void>;
}
