/**
 * Currency formatting utilities
 */

import type { TransactionType } from "@/composables/useTransactions";

// Currency symbol mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  CHF: "Fr",
  CNY: "¥",
  // Add more currencies as needed
};

// Currency name mapping
const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  CHF: "Swiss Franc",
  CNY: "Chinese Yuan",
  // Add more currencies as needed
};

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Get currency name for a given currency code
 */
export function getCurrencyName(currencyCode: string): string {
  return CURRENCY_NAMES[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Get full currency title (name + code)
 */
export function getCurrencyTitle(currencyCode: string): string {
  const name = getCurrencyName(currencyCode);
  return `${name} (${currencyCode.toUpperCase()})`;
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

  const numberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      ...numberFormatOptions,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is not supported by Intl.NumberFormat
    console.warn(`Unsupported currency code: ${currencyCode}`, error);
    const symbol = getCurrencySymbol(currencyCode);
    try {
      const formatted = new Intl.NumberFormat(undefined, numberFormatOptions).format(amount);
      return `${symbol}${formatted}`;
    } catch (fallbackError) {
      console.error("Fallback formatting also failed:", fallbackError);
      return `${symbol}${amount.toFixed(2)}`;
    }
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
  // INCOME and TRANSFER_IN increase account balance (positive)
  // EXPENSE and TRANSFER_OUT decrease account balance (negative)
  const sign = type === "INCOME" || type === "TRANSFER_IN" ? "+" : "-";
  const formatted = formatCurrency(amount, currencyCode);
  return `${sign}${formatted}`;
}
