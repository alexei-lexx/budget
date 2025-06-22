/**
 * Currency formatting utilities
 */

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
 * Format amount with currency using Intl.NumberFormat
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  options: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showCurrencyCode?: boolean;
  } = {},
): string {
  const {
    locale = "en-US",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showCurrencyCode = false,
  } = options;

  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);

    // If showCurrencyCode is true, append the currency code
    if (showCurrencyCode) {
      return `${formatted} ${currencyCode.toUpperCase()}`;
    }

    return formatted;
  } catch (error) {
    // Fallback if currency code is not supported by Intl.NumberFormat
    console.warn(`Unsupported currency code: ${currencyCode}`, error);
    const symbol = getCurrencySymbol(currencyCode);
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
    return `${symbol}${formatted}`;
  }
}

/**
 * Format amount with symbol only (no currency code)
 */
export function formatCurrencySymbol(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol}${formatted}`;
}

/**
 * Format amount for display in lists/cards (compact format)
 */
export function formatCurrencyCompact(
  amount: number,
  currencyCode: string,
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
  } = {},
): string {
  const { showSymbol = true, showCode = false } = options;

  if (showSymbol && showCode) {
    return formatCurrency(amount, currencyCode, { showCurrencyCode: true });
  } else if (showSymbol) {
    return formatCurrency(amount, currencyCode);
  } else if (showCode) {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formatted} ${currencyCode.toUpperCase()}`;
  } else {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

/**
 * Get currency input prefix symbol for forms
 */
export function getCurrencyInputPrefix(currencyCode: string): string {
  return getCurrencySymbol(currencyCode);
}

/**
 * Validate currency code format
 */
export function isValidCurrencyCode(currencyCode: string): boolean {
  return /^[A-Z]{3}$/.test(currencyCode.toUpperCase());
}

/**
 * Normalize currency code to uppercase
 */
export function normalizeCurrencyCode(currencyCode: string): string {
  return currencyCode.toUpperCase();
}
