import { describe, expect, it } from "vitest";
import { DATE_FORMAT_REGEX, toDateString } from "../types/date-string";
import {
  daysAgo,
  daysBetween,
  firstDayOfMonth,
  lastDayOfMonth,
  localTodayDateString,
} from "./date";

describe("date utilities", () => {
  describe("localTodayDateString", () => {
    it("returns a date in YYYY-MM-DD format", () => {
      expect(localTodayDateString()).toMatch(DATE_FORMAT_REGEX);
    });
  });

  describe("daysBetween", () => {
    it("returns 0 for same date", () => {
      const date = toDateString("2000-01-01");
      expect(daysBetween(date, date)).toBe(0);
    });

    it("returns 1 for consecutive days", () => {
      expect(
        daysBetween(toDateString("2000-01-01"), toDateString("2000-01-02")),
      ).toBe(1);
    });

    it("returns 365 for non-leap year span", () => {
      expect(
        daysBetween(toDateString("2001-01-01"), toDateString("2002-01-01")),
      ).toBe(365);
    });

    it("returns 366 for leap year span", () => {
      expect(
        daysBetween(toDateString("2000-01-01"), toDateString("2001-01-01")),
      ).toBe(366);
    });

    it("returns a negative number when end precedes start", () => {
      expect(
        daysBetween(toDateString("2000-01-02"), toDateString("2000-01-01")),
      ).toBe(-1);
    });
  });

  describe("daysAgo", () => {
    it("returns the same date for 0 days ago", () => {
      expect(daysAgo(toDateString("2000-01-05"), 0)).toBe("2000-01-05");
    });

    it("returns the previous date for 1 day ago", () => {
      expect(daysAgo(toDateString("2000-01-05"), 1)).toBe("2000-01-04");
    });

    it("crosses month boundaries", () => {
      expect(daysAgo(toDateString("2000-03-01"), 1)).toBe("2000-02-29");
    });

    it("crosses year boundaries", () => {
      expect(daysAgo(toDateString("2000-01-01"), 5)).toBe("1999-12-27");
    });
  });

  describe("firstDayOfMonth", () => {
    it("returns the first day of the month", () => {
      expect(firstDayOfMonth(2024, 2)).toBe("2024-02-01");
    });

    it("returns the first day of January", () => {
      expect(firstDayOfMonth(2024, 1)).toBe("2024-01-01");
    });
  });

  describe("lastDayOfMonth", () => {
    it("returns 29 February in a leap year", () => {
      expect(lastDayOfMonth(2024, 2)).toBe("2024-02-29");
    });

    it("returns 28 February in a non-leap year", () => {
      expect(lastDayOfMonth(2023, 2)).toBe("2023-02-28");
    });

    it("returns the last day of December", () => {
      expect(lastDayOfMonth(2024, 12)).toBe("2024-12-31");
    });

    it("returns the last day of a 30-day month", () => {
      expect(lastDayOfMonth(2024, 4)).toBe("2024-04-30");
    });
  });
});
