/**
 * Date utility functions
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Format a Date object as YYYY-MM-DD string (local timezone)
 */
export function formatDateAsYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
}

export function daysAgo(date: Date, days: number): Date {
  return new Date(date.getTime() - days * MS_PER_DAY);
}
