import { DateString } from "./date";

export interface DateRange {
  startDate: DateString;
  endDate: DateString;
}

/**
 * Constructs a DateRange, throwing if startDate is after endDate.
 */
export function toDateRange(
  startDate: DateString,
  endDate: DateString,
): DateRange {
  if (startDate > endDate) {
    throw new Error(
      `Invalid date range: start ${startDate} is after end ${endDate}`,
    );
  }
  return { startDate, endDate };
}
