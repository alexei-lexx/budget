import type { TransactionType } from "@/composables/useTransactions";

export function isPositiveTransactionType(type: TransactionType): boolean {
  return type === "INCOME" || type === "TRANSFER_IN" || type === "REFUND";
}

export function getTransactionTypeColor(type: TransactionType): string {
  switch (type) {
    case "EXPENSE":
      return "error";
    case "INCOME":
      return "success";
    case "REFUND":
      return "info";
    case "TRANSFER_IN":
      return "warning";
    case "TRANSFER_OUT":
      return "warning";
  }
}
