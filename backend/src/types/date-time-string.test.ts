import { describe, expect, it } from "vitest";
import {
  InvalidDateTimeStringError,
  isDateTimeString,
  toDateTimeString,
} from "./date-time-string";

describe("isDateTimeString", () => {
  describe("valid datetimes", () => {
    it("returns true for a valid datetime", () => {
      expect(isDateTimeString("2000-01-02T10:11:12.000Z")).toBe(true);
    });

    it("returns true for a datetime matching Date.toISOString() output", () => {
      expect(isDateTimeString(new Date().toISOString())).toBe(true);
    });

    it("returns true for leap day in a leap year", () => {
      expect(isDateTimeString("2024-02-29T00:00:00.000Z")).toBe(true);
    });
  });

  describe("wrong format", () => {
    it("returns false for a date-only string", () => {
      expect(isDateTimeString("2000-01-15")).toBe(false);
    });

    it("returns false for a datetime without milliseconds", () => {
      expect(isDateTimeString("2000-01-15T00:00:00Z")).toBe(false);
    });

    it("returns false for a datetime with an offset instead of Z", () => {
      expect(isDateTimeString("2000-01-15T00:00:00.000+02:00")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isDateTimeString("")).toBe(false);
    });
  });

  describe("non-existent dates", () => {
    it("returns false for Feb 29 in a non-leap year", () => {
      expect(isDateTimeString("2003-02-29T00:00:00.000Z")).toBe(false);
    });

    it("returns false for month 13", () => {
      expect(isDateTimeString("2000-13-01T00:00:00.000Z")).toBe(false);
    });

    it("returns false for hour 25", () => {
      expect(isDateTimeString("2000-01-01T25:00:00.000Z")).toBe(false);
    });
  });
});

describe("toDateTimeString", () => {
  it("returns the value unchanged for a valid datetime", () => {
    expect(toDateTimeString("2000-01-15T10:11:12.000Z")).toBe(
      "2000-01-15T10:11:12.000Z",
    );
  });

  it("throws InvalidDateTimeStringError for an invalid datetime format", () => {
    expect(() => toDateTimeString("2000-01-15")).toThrow(
      InvalidDateTimeStringError,
    );
    expect(() => toDateTimeString("2000-01-15")).toThrow(
      'Invalid datetime format: "2000-01-15". Expected YYYY-MM-DDTHH:mm:ss.sssZ.',
    );
  });

  it("throws InvalidDateTimeStringError for a non-existent date", () => {
    expect(() => toDateTimeString("2000-13-31T00:00:00.000Z")).toThrow(
      InvalidDateTimeStringError,
    );
  });

  it("throws InvalidDateTimeStringError for an empty string", () => {
    expect(() => toDateTimeString("")).toThrow(InvalidDateTimeStringError);
  });
});
