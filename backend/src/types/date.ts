import { DATE_FORMAT_REGEX } from "./validation";

/**
 * Branded string type representing a valid date in YYYY-MM-DD format.
 * Use `isDateString` to narrow or `toDateString` to construct validated values.
 */
export type DateString = string & { readonly __brand: unique symbol };

/**
 * Type guard: returns true if the value matches YYYY-MM-DD format.
 */
export function isDateString(value: string): value is DateString {
  // Regex enforces strict YYYY-MM-DD format (rejects ISO datetimes, slashes, etc.)
  if (!DATE_FORMAT_REGEX.test(value)) {
    return false;
  }

  // Date parse guards against structurally valid but non-existent dates (e.g. 2024-02-31)
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

/**
 * Constructs a DateString, throwing if the value is not in YYYY-MM-DD format.
 */
export function toDateString(value: string): DateString {
  if (!isDateString(value)) {
    throw new Error(`Invalid date format: "${value}". Expected YYYY-MM-DD.`);
  }
  return value;
}
