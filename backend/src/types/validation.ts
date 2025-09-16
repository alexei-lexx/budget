/**
 * Shared validation constants and utilities
 */

/**
 * Regular expression for validating date strings in YYYY-MM-DD format
 */
export const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Error message for invalid date format
 */
export const DATE_FORMAT_ERROR_MESSAGE = "Date must be in YYYY-MM-DD format";

/**
 * Maximum length for description fields
 */
export const DESCRIPTION_MAX_LENGTH = 500;

/**
 * Error message for description length validation
 */
export const DESCRIPTION_LENGTH_ERROR_MESSAGE = `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`;

/**
 * Year range offset for validation (current year ± this value)
 */
export const YEAR_RANGE_OFFSET = 100;

/**
 * Minimum length required for search text inputs
 */
export const MIN_SEARCH_TEXT_LENGTH = 2;
