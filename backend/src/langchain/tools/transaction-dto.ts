import { Transaction, TransactionType } from "../../models/transaction";

export interface TransactionDto {
  id: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  description?: string;
  transferId?: string;
  compoundTransaction?: { id: string; totalAmount: number };
}

export const toTransactionDto = (transaction: Transaction): TransactionDto => ({
  id: transaction.id,
  accountId: transaction.accountId,
  categoryId: transaction.categoryId,
  type: transaction.type,
  amount: transaction.amount,
  currency: transaction.currency,
  date: transaction.date,
  description: transaction.description,
  transferId: transaction.transferId,
  compoundTransaction: transaction.compoundTransaction,
});
