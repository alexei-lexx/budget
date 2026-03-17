/**
 * Date validation utilities
 */

/**
 * Validate year and month parameters
 */
export function isValidYearMonth(year: number, month: number): boolean {
  return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
}
