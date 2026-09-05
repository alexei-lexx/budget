import { Temporal } from "temporal-polyfill";

/**
 * Error thrown when a string fails to parse as a valid YYYY-MM-DD date
 */
export class InvalidDateStringError extends Error {
  constructor(value: string) {
    super(`Invalid date format: "${value}". Expected YYYY-MM-DD.`);
    this.name = "InvalidDateStringError";
  }
}

/**
 * Regular expression for validating date strings in YYYY-MM-DD format
 */
export const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

  // Rejects out-of-range dates (e.g. "2023-02-29") rather than rolling them over
  try {
    Temporal.PlainDate.from(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Constructs a DateString, throwing if the value is not in YYYY-MM-DD format.
 */
export function toDateString(value: string): DateString {
  if (!isDateString(value)) {
    throw new InvalidDateStringError(value);
  }
  return value;
}

/**
 * Converts a Date to a DateString, resolving the calendar day in the given IANA time zone.
 */
export function dateToDateString(value: Date, timeZone = "UTC"): DateString {
  return toDateString(
    Temporal.Instant.fromEpochMilliseconds(value.getTime())
      .toZonedDateTimeISO(timeZone)
      .toPlainDate()
      .toString(),
  );
}

export function toDateStringOrUndefined(
  value: string | null | undefined,
): DateString | undefined {
  if (value == null) {
    return undefined;
  }

  return toDateString(value);
}
