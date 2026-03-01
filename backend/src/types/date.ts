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

  // Re-parse and compare components to reject dates that JavaScript rolls over
  // (e.g. "2023-02-29" parses as 2023-03-01 rather than NaN)
  const parsed = new Date(value);
  const [expectedYear, expectedMonth, expectedDay] = value
    .split("-")
    .map(Number);

  return (
    parsed.getUTCFullYear() === expectedYear &&
    parsed.getUTCMonth() + 1 === expectedMonth &&
    parsed.getUTCDate() === expectedDay
  );
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

export function toDateStringOrUndefined(
  value: string | null | undefined,
): DateString | undefined {
  if (value == null) {
    return undefined;
  }

  return toDateString(value);
}
