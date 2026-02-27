import { DateString, isDateString } from "./date";

export type DateRange = {
  readonly startDate: DateString;
  readonly endDate: DateString;
} & { readonly __brand: unique symbol };

export function isDateRange(value: {
  startDate: string;
  endDate: string;
}): value is DateRange {
  return (
    isDateString(value.startDate) &&
    isDateString(value.endDate) &&
    value.startDate <= value.endDate
  );
}

/**
 * Constructs a DateRange, throwing if dates are invalid or startDate is after endDate.
 */
export function toDateRange(
  startDate: DateString | string,
  endDate: DateString | string,
): DateRange {
  const range = { startDate, endDate };
  if (!isDateRange(range)) {
    if (!isDateString(startDate)) {
      throw new Error(
        `Invalid startDate: "${startDate}". Expected YYYY-MM-DD.`,
      );
    }
    if (!isDateString(endDate)) {
      throw new Error(`Invalid endDate: "${endDate}". Expected YYYY-MM-DD.`);
    }
    throw new Error(
      `Invalid date range: start ${startDate} is after end ${endDate}`,
    );
  }
  return range;
}
