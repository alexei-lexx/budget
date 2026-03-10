import { describe, expect, it } from "@jest/globals";
import { daysAgo, daysBetween, formatDateAsYYYYMMDD } from "./date";

describe("date utilities", () => {
  describe("formatDateAsYYYYMMDD", () => {
    it("should format date correctly", () => {
      const date = new Date(Date.UTC(2000, 0, 5)); // January 5, 2000
      expect(formatDateAsYYYYMMDD(date)).toBe("2000-01-05");
    });
  });

  describe("daysBetween", () => {
    it("should return 0 for the same date", () => {
      const date = new Date("2000-01-01");
      expect(daysBetween(date, date)).toBe(0);
    });

    it("should return 1 for consecutive days", () => {
      expect(daysBetween(new Date("2000-01-01"), new Date("2000-01-02"))).toBe(
        1,
      );
    });

    it("should return 365 for a non-leap year span", () => {
      expect(daysBetween(new Date("2001-01-01"), new Date("2002-01-01"))).toBe(
        365,
      );
    });

    it("should return 366 for a leap year span", () => {
      expect(daysBetween(new Date("2000-01-01"), new Date("2001-01-01"))).toBe(
        366,
      );
    });
  });

  describe("daysAgo", () => {
    it("should return the correct date for 0 days ago", () => {
      const today = new Date();
      expect(daysAgo(today, 0)).toEqual(today);
    });

    it("should return the correct date for 1 day ago", () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      expect(daysAgo(today, 1)).toEqual(yesterday);
    });

    it("should return the correct date for multiple days ago", () => {
      const today = new Date();
      const pastDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
      expect(daysAgo(today, 5)).toEqual(pastDate);
    });
  });
});
