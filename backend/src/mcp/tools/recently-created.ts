import { Temporal } from "temporal-polyfill";
import { DateTimeString } from "../../types/date-time-string";

const RECENT_WINDOW = Temporal.Duration.from({ hours: 1 });
const RECENT_WINDOW_MS = RECENT_WINDOW.total("milliseconds");

// Human-readable text, e.g. "1 hour"
export const RECENT_WINDOW_TEXT = RECENT_WINDOW.toLocaleString("en", {
  style: "long",
});

export function isRecentlyCreated(createdAt: DateTimeString): boolean {
  return Date.now() - Date.parse(createdAt) <= RECENT_WINDOW_MS;
}
