import { Account } from "../models/account";
import { Transaction } from "../models/transaction";

export interface AtomicWriterInput {
  transactionsToCreate?: readonly Transaction[];
  transactionsToUpdate?: readonly Transaction[];
  accountsToUpdate?: readonly Account[];
}

export interface AtomicWriteOutput {
  createdTransactions: readonly Transaction[];
  updatedTransactions: readonly Transaction[];
  updatedAccounts: readonly Account[];
}

export interface AtomicWriter {
  commit(input: AtomicWriterInput): Promise<AtomicWriteOutput>;
}
