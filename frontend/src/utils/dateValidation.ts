/**
 * Date validation utilities
 */

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
