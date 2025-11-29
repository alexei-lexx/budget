/**
 * Date utility functions
 */

/**
 * Day of week enumeration matching JavaScript Date.getDay()
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

/**
 * Calculate the day of week for a given date string
 *
 * @param dateString - ISO 8601 date string in format YYYY-MM-DD
 * @returns Day of week (0=Sunday, 6=Saturday)
 *
 * @example
 * getDayOfWeek("2025-01-01") // Returns DayOfWeek.WEDNESDAY (3)
 */
export function getDayOfWeek(dateString: string): DayOfWeek {
  // Parse as UTC to avoid timezone issues
  const date = new Date(dateString + "T00:00:00Z");
  const dayOfWeek = date.getUTCDay();

  // Validate that the result is a valid DayOfWeek enum value
  if (dayOfWeek < DayOfWeek.SUNDAY || dayOfWeek > DayOfWeek.SATURDAY) {
    throw new Error(`Invalid day of week: ${dayOfWeek}`);
  }

  return dayOfWeek;
}

/**
 * Count how many times a specific weekday occurs in a given month
 *
 * @param year - The year (e.g., 2025)
 * @param month - The month (1-12, where 1=January, 12=December)
 * @param dayOfWeek - The day of week to count (0=Sunday, 6=Saturday)
 * @returns The number of occurrences (typically 4 or 5)
 *
 * @example
 * getWeekdayOccurrencesInMonth(2025, 1, DayOfWeek.MONDAY) // Returns 5 (5 Mondays in January 2025)
 * getWeekdayOccurrencesInMonth(2025, 2, DayOfWeek.SUNDAY) // Returns 4 (4 Sundays in February 2025)
 */
export function getWeekdayOccurrencesInMonth(
  year: number,
  month: number,
  dayOfWeek: DayOfWeek,
): number {
  let count = 0;

  // month is 0-indexed in Date constructor
  // new Date(year, month, 0) gives last day of (month - 1)
  // which is the last day of the month we want
  const lastDay = new Date(year, month, 0).getDate();

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(
      Date.UTC(year, month - 1, day), // month is 0-indexed in Date constructor
    );
    if (date.getUTCDay() === dayOfWeek) {
      count++;
    }
  }

  return count;
}

/**
 * Format a Date object as YYYY-MM-DD string (local timezone)
 */
export function formatDateAsYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}
