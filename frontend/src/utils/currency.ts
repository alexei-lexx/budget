/**
 * Currency formatting utilities
 */

import type { TransactionType } from "@/composables/useTransactions";
import { isPositiveTransactionType } from "./transaction";

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string, locale?: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "symbol",
    }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value ?? currencyCode;
  } catch {
    return currencyCode;
  }
}

/**
 * Format amount with currency symbol using Intl.NumberFormat
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  // Input validation
  if (!isFinite(amount)) {
    console.warn("Invalid amount provided to formatCurrency:", amount);
    amount = 0;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.warn(`Unsupported currency code: ${currencyCode}`, error);
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

/**
 * Format transaction amount with +/- sign
 */
export function formatTransactionAmount(
  amount: number,
  currencyCode: string,
  type: TransactionType,
): string {
  const sign = isPositiveTransactionType(type) ? "+" : "-";
  const formatted = formatCurrency(amount, currencyCode);
  return `${sign}${formatted}`;
}
