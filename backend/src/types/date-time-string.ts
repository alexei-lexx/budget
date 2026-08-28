import { Temporal } from "temporal-polyfill";

/**
 * Error thrown when a string fails to parse as a valid ISO 8601 UTC datetime
 */
export class InvalidDateTimeStringError extends Error {
  constructor(value: string) {
    super(
      `Invalid datetime format: "${value}". Expected YYYY-MM-DDTHH:mm:ss.sssZ.`,
    );
    this.name = "InvalidDateTimeStringError";
  }
}

/**
 * Regular expression for validating datetime strings in the format produced
 * by `Date.prototype.toISOString()` (YYYY-MM-DDTHH:mm:ss.sssZ).
 */
export const DATE_TIME_FORMAT_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * Branded string type representing a valid datetime in
 * YYYY-MM-DDTHH:mm:ss.sssZ format, matching `Date.prototype.toISOString()`.
 * Use `isDateTimeString` to narrow or `toDateTimeString` to construct validated values.
 */
export type DateTimeString = string & { readonly __brand: unique symbol };

/**
 * Type guard: returns true if the value matches Date.toISOString() format.
 */
export function isDateTimeString(value: string): value is DateTimeString {
  // Regex enforces strict YYYY-MM-DDTHH:mm:ss.sssZ format
  if (!DATE_TIME_FORMAT_REGEX.test(value)) {
    return false;
  }

  // Rejects out-of-range dates/times (e.g. "2023-02-29") rather than rolling them over
  try {
    Temporal.Instant.from(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Constructs a DateTimeString, throwing if the value is not in
 * Date.toISOString() format.
 */
export function toDateTimeString(value: string): DateTimeString {
  if (!isDateTimeString(value)) {
    throw new InvalidDateTimeStringError(value);
  }
  return value;
}
