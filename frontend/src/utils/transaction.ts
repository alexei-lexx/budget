import type { TransactionType } from "@/composables/useTransactions";

export function isPositiveTransactionType(type: TransactionType): boolean {
  return type === "INCOME" || type === "TRANSFER_IN" || type === "REFUND";
}
