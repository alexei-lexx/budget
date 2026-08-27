/**
 * Date utility functions
 *
 * All calendar arithmetic goes through Temporal.PlainDate, a timezone-free
 * calendar date, and is expressed in terms of DateString (YYYY-MM-DD).
 */

import { Temporal } from "temporal-polyfill";
import { DateString, toDateString } from "../types/date-string";

/**
 * Today's date in the system timezone
 */
export function localTodayDateString(): DateString {
  return toDateString(Temporal.Now.plainDateISO().toString());
}

/**
 * Number of whole days from start to end; negative when end precedes start
 */
export function daysBetween(start: DateString, end: DateString): number {
  return Temporal.PlainDate.from(start).until(Temporal.PlainDate.from(end), {
    largestUnit: "day",
  }).days;
}

export function daysAgo(date: DateString, days: number): DateString {
  return toDateString(
    Temporal.PlainDate.from(date).subtract({ days }).toString(),
  );
}

export function firstDayOfMonth(year: number, month: number): DateString {
  return toDateString(
    Temporal.PlainDate.from({ year, month, day: 1 }).toString(),
  );
}

export function lastDayOfMonth(year: number, month: number): DateString {
  const date = Temporal.PlainDate.from({ year, month, day: 1 });
  return toDateString(date.with({ day: date.daysInMonth }).toString());
}

export function daysInMonth(year: number, month: number): number {
  return Temporal.PlainDate.from({ year, month, day: 1 }).daysInMonth;
}
