/**
 * Shared validation constants and utilities
 */

/**
 * Regular expression for validating date strings in YYYY-MM-DD format
 */
export const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Maximum length for description fields
 */
export const DESCRIPTION_MAX_LENGTH = 500;

/**
 * Year range offset for validation (current year ± this value)
 */
export const YEAR_RANGE_OFFSET = 100;

/**
 * Minimum length required for search text inputs
 */
export const MIN_SEARCH_TEXT_LENGTH = 2;

/**
 * Minimum and maximum length for account and category name fields
 */
export const NAME_MIN_LENGTH = 1;
export const NAME_MAX_LENGTH = 100;

/**
 * Supported currency codes
 */
export const SUPPORTED_CURRENCIES = ["EUR", "USD"];
