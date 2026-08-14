/**
 * Currency amount validation utilities
 */

import type { CheckRule } from "@/utils/validation";

/**
 * Standard currency amount validation rules
 * - Positive numbers only
 * - Maximum 2 decimal places
 * - Reasonable amount limits
 * - Minimum 0.01 for practical currency use
 */
export function createCurrencyAmountRules(t: (key: string) => string): CheckRule<number>[] {
  return [
    (value: number) => (!isNaN(value) && value > 0) || t("common.amountValidation.mustBePositive"),
    (value: number) => {
      // Check for reasonable maximum (prevent overflow issues)
      const maxAmount = 999999999.99; // ~1 billion with 2 decimal places
      return value <= maxAmount || t("common.amountValidation.tooLarge");
    },
    (value: number) => {
      // Validate decimal places (max 2 for currency)
      const decimalPlaces = (value.toString().split(".")[1] || "").length;
      return decimalPlaces <= 2 || t("common.amountValidation.tooManyDecimals");
    },
    (value: number) => {
      // Additional validation for very small amounts (minimum 0.01 for most currencies)
      return value >= 0.01 || t("common.amountValidation.tooSmall");
    },
  ];
}
