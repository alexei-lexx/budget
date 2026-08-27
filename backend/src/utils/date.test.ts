import { describe, expect, it } from "vitest";
import { toDateString } from "../types/date-string";
import { daysAgo, daysBetween } from "./date";

describe("date utilities", () => {
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
});
