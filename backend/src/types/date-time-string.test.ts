import { describe, expect, it } from "vitest";
import {
  InvalidDateTimeStringError,
  isDateTimeString,
  toDateTimeString,
} from "./date-time-string";

describe("isDateTimeString", () => {
  // Happy path

  it("returns true for valid datetime", () => {
    // Act & Assert
    expect(isDateTimeString("2000-01-02T10:11:12.000Z")).toBe(true);
  });

  it("returns true for datetime matching Date.toISOString() output", () => {
    // Act & Assert
    expect(isDateTimeString(new Date().toISOString())).toBe(true);
  });

  it("returns true for leap day in leap year", () => {
    // Act & Assert
    expect(isDateTimeString("2024-02-29T00:00:00.000Z")).toBe(true);
  });

  it("returns true for datetime without milliseconds", () => {
    // Act & Assert
    expect(isDateTimeString("2000-01-15T00:00:00Z")).toBe(true);
  });

  // Validation failures

  it("returns false for date-only string", () => {
    // Act & Assert
    expect(isDateTimeString("2000-01-15")).toBe(false);
  });

  it("returns false for datetime with offset instead of Z", () => {
    // Act & Assert
    expect(isDateTimeString("2000-01-15T00:00:00.000+02:00")).toBe(false);
  });

  it("returns false for empty string", () => {
    // Act & Assert
    expect(isDateTimeString("")).toBe(false);
  });

  it("returns false for Feb 29 in non-leap year", () => {
    // Act & Assert
    expect(isDateTimeString("2003-02-29T00:00:00.000Z")).toBe(false);
  });

  it("returns false for month 13", () => {
    // Act & Assert
    expect(isDateTimeString("2000-13-01T00:00:00.000Z")).toBe(false);
  });

  it("returns false for hour 25", () => {
    // Act & Assert
    expect(isDateTimeString("2000-01-01T25:00:00.000Z")).toBe(false);
  });
});

describe("toDateTimeString", () => {
  // Happy path

  it("returns value unchanged for valid datetime", () => {
    // Act & Assert
    expect(toDateTimeString("2000-01-15T10:11:12.000Z")).toBe(
      "2000-01-15T10:11:12.000Z",
    );
  });

  // Validation failures

  it("throws InvalidDateTimeStringError for invalid datetime format", () => {
    // Act & Assert
    expect(() => toDateTimeString("2000-01-15")).toThrow(
      InvalidDateTimeStringError,
    );
    expect(() => toDateTimeString("2000-01-15")).toThrow(
      'Invalid datetime format: "2000-01-15". Expected ISO 8601 UTC datetime (e.g. 2024-01-15T10:30:00Z).',
    );
  });

  it("throws InvalidDateTimeStringError for non-existent date", () => {
    // Act & Assert
    expect(() => toDateTimeString("2000-13-31T00:00:00.000Z")).toThrow(
      InvalidDateTimeStringError,
    );
  });

  it("throws InvalidDateTimeStringError for empty string", () => {
    // Act & Assert
    expect(() => toDateTimeString("")).toThrow(InvalidDateTimeStringError);
  });
});
