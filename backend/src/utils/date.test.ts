import { describe, expect, it } from "vitest";
import { toDateString } from "../types/date-string";
import { daysBetween } from "./date";

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
});
