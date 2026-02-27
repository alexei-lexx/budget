import { DateString, toDateString } from "./date";

export interface DateRange {
  startDate: DateString;
  endDate: DateString;
}

/**
 * Constructs a DateRange, throwing if dates are invalid or startDate is after endDate.
 */
export function toDateRange(
  startDate: DateString | string,
  endDate: DateString | string,
): DateRange {
  const validStart = toDateString(startDate);
  const validEnd = toDateString(endDate);

  if (validStart > validEnd) {
    throw new Error(
      `Invalid date range: start ${validStart} is after end ${validEnd}`,
    );
  }

  return { startDate: validStart, endDate: validEnd };
}
