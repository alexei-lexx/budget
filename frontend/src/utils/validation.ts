/**
 * Validation utilities for form components and date/year validation
 */

export type CheckRule<T = string> = (value: T) => boolean | string;

/**
 * Helper function to check if validation rules pass
 * @param value The value to validate
 * @param rules Array of validation rules to apply
 * @returns true if all rules pass, false otherwise
 */
export const checkRules = <T>(value: T, rules: CheckRule<T>[]): boolean => {
  return rules.every((rule) => rule(value) === true);
};

/**
 * Year range offset for validation (current year ± this value)
 * Should match backend YEAR_RANGE_OFFSET
 */
export const YEAR_RANGE_OFFSET = 100;

/**
 * Validate year and month parameters
 */
export function isValidYearMonth(year: number, month: number): boolean {
  const currentYear = new Date().getFullYear();

  return (
    Number.isInteger(year) &&
    year >= currentYear - YEAR_RANGE_OFFSET &&
    year <= currentYear + YEAR_RANGE_OFFSET &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  );
}

/**
 * Format month and year for display (e.g., "January 2024")
 */
export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
