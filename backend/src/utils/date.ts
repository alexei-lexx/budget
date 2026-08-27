import { Temporal } from "temporal-polyfill";
import { DateString } from "../types/date-string";

/**
 * Number of whole days from start to end; negative when end precedes start
 */
export function daysBetween(start: DateString, end: DateString): number {
  return Temporal.PlainDate.from(start).until(Temporal.PlainDate.from(end), {
    largestUnit: "day",
  }).days;
}
