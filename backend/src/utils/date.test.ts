import { describe, it, expect } from "@jest/globals";
import { getDayOfWeek, DayOfWeek, getWeekdayOccurrencesInMonth } from "./date";

describe("date utilities", () => {
  describe("getDayOfWeek", () => {
    it("should correctly identify Sunday", () => {
      // 2025-01-05 is a Sunday
      expect(getDayOfWeek("2025-01-05")).toBe(DayOfWeek.SUNDAY);
    });

    it("should correctly identify Monday", () => {
      // 2025-01-06 is a Monday
      expect(getDayOfWeek("2025-01-06")).toBe(DayOfWeek.MONDAY);
    });

    it("should correctly identify Tuesday", () => {
      // 2025-01-07 is a Tuesday
      expect(getDayOfWeek("2025-01-07")).toBe(DayOfWeek.TUESDAY);
    });

    it("should correctly identify Wednesday", () => {
      // 2025-01-01 is a Wednesday
      expect(getDayOfWeek("2025-01-01")).toBe(DayOfWeek.WEDNESDAY);
    });

    it("should correctly identify Thursday", () => {
      // 2025-01-02 is a Thursday
      expect(getDayOfWeek("2025-01-02")).toBe(DayOfWeek.THURSDAY);
    });

    it("should correctly identify Friday", () => {
      // 2025-01-03 is a Friday
      expect(getDayOfWeek("2025-01-03")).toBe(DayOfWeek.FRIDAY);
    });

    it("should correctly identify Saturday", () => {
      // 2025-01-04 is a Saturday
      expect(getDayOfWeek("2025-01-04")).toBe(DayOfWeek.SATURDAY);
    });

    it("should handle month boundaries correctly", () => {
      // 2025-01-31 is a Friday
      expect(getDayOfWeek("2025-01-31")).toBe(DayOfWeek.FRIDAY);
      // 2025-02-01 is a Saturday
      expect(getDayOfWeek("2025-02-01")).toBe(DayOfWeek.SATURDAY);
    });

    it("should handle year boundaries correctly", () => {
      // 2024-12-31 is a Tuesday
      expect(getDayOfWeek("2024-12-31")).toBe(DayOfWeek.TUESDAY);
      // 2025-01-01 is a Wednesday
      expect(getDayOfWeek("2025-01-01")).toBe(DayOfWeek.WEDNESDAY);
    });

    it("should handle leap year February correctly", () => {
      // 2024 is a leap year
      // 2024-02-29 is a Thursday
      expect(getDayOfWeek("2024-02-29")).toBe(DayOfWeek.THURSDAY);
    });

    it("should handle dates in different years consistently", () => {
      // 2020-01-01 is a Wednesday
      expect(getDayOfWeek("2020-01-01")).toBe(DayOfWeek.WEDNESDAY);
      // 2030-01-01 is a Tuesday
      expect(getDayOfWeek("2030-01-01")).toBe(DayOfWeek.TUESDAY);
    });

    it("should parse dates as UTC to avoid timezone issues", () => {
      // Testing that date parsing is consistent regardless of local timezone
      // 2025-06-15 is always a Sunday in UTC
      expect(getDayOfWeek("2025-06-15")).toBe(DayOfWeek.SUNDAY);
    });
  });

  describe("getWeekdayOccurrencesInMonth", () => {
    it("should count 5 occurrences when weekday appears 5 times", () => {
      // January 2025 starts on Wednesday, so it has 5 Wednesdays, Thursdays, Fridays
      expect(getWeekdayOccurrencesInMonth(2025, 1, DayOfWeek.WEDNESDAY)).toBe(
        5,
      );
      expect(getWeekdayOccurrencesInMonth(2025, 1, DayOfWeek.THURSDAY)).toBe(5);
      expect(getWeekdayOccurrencesInMonth(2025, 1, DayOfWeek.FRIDAY)).toBe(5);
    });

    it("should count 4 occurrences when weekday appears 4 times", () => {
      // January 2025 has 4 Sundays, Mondays, Tuesdays
      expect(getWeekdayOccurrencesInMonth(2025, 1, DayOfWeek.SUNDAY)).toBe(4);
      expect(getWeekdayOccurrencesInMonth(2025, 1, DayOfWeek.MONDAY)).toBe(4);
      expect(getWeekdayOccurrencesInMonth(2025, 1, DayOfWeek.TUESDAY)).toBe(4);
    });

    it("should handle February in non-leap years", () => {
      // February 2025 starts on Saturday (28 days)
      expect(getWeekdayOccurrencesInMonth(2025, 2, DayOfWeek.SATURDAY)).toBe(4);
      expect(getWeekdayOccurrencesInMonth(2025, 2, DayOfWeek.SUNDAY)).toBe(4);
      expect(getWeekdayOccurrencesInMonth(2025, 2, DayOfWeek.MONDAY)).toBe(4);
      expect(getWeekdayOccurrencesInMonth(2025, 2, DayOfWeek.TUESDAY)).toBe(4);
      expect(getWeekdayOccurrencesInMonth(2025, 2, DayOfWeek.WEDNESDAY)).toBe(
        4,
      );
      expect(getWeekdayOccurrencesInMonth(2025, 2, DayOfWeek.THURSDAY)).toBe(4);
      expect(getWeekdayOccurrencesInMonth(2025, 2, DayOfWeek.FRIDAY)).toBe(4);
    });

    it("should handle February in leap years", () => {
      // February 2024 starts on Thursday (29 days = 4 weeks + 1 day)
      // Only Thursday appears 5 times (1st, 8th, 15th, 22nd, 29th)
      expect(getWeekdayOccurrencesInMonth(2024, 2, DayOfWeek.THURSDAY)).toBe(5);
      expect(getWeekdayOccurrencesInMonth(2024, 2, DayOfWeek.FRIDAY)).toBe(4);
      expect(getWeekdayOccurrencesInMonth(2024, 2, DayOfWeek.SATURDAY)).toBe(4);
      expect(getWeekdayOccurrencesInMonth(2024, 2, DayOfWeek.SUNDAY)).toBe(4);
      expect(getWeekdayOccurrencesInMonth(2024, 2, DayOfWeek.MONDAY)).toBe(4);
      expect(getWeekdayOccurrencesInMonth(2024, 2, DayOfWeek.TUESDAY)).toBe(4);
      expect(getWeekdayOccurrencesInMonth(2024, 2, DayOfWeek.WEDNESDAY)).toBe(
        4,
      );
    });
  });
});
