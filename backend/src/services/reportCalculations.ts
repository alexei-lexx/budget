import { Transaction } from "../models/Transaction";

/**
 * Calculate currency totals from a list of transactions
 * Groups transactions by currency and sums their amounts
 *
 * @param transactions - List of transactions to aggregate
 * @returns Array of currency totals, sorted alphabetically by currency code
 */
export function calculateCurrencyTotals(
  transactions: Transaction[],
): { currency: string; totalAmount: number }[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    const current = totals.get(transaction.currency) || 0;
    totals.set(transaction.currency, current + transaction.amount);
  }

  return Array.from(totals.entries())
    .map(([currency, totalAmount]) => ({ currency, totalAmount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
