import { describe, it, expect, afterEach, vi } from "vitest";
import { formatMonthYear, getTodayDateString } from "./date";

describe("formatMonthYear", () => {
  // Happy path

  it("formats in en-US locale", () => {
    const result = formatMonthYear(2024, 3, "en-US");

    expect(result).toBe("March 2024");
  });

  it("formats in de-DE locale", () => {
    const result = formatMonthYear(2024, 3, "de-DE");

    expect(result).toBe("März 2024");
  });
});

describe("getTodayDateString", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Happy path

  it("returns local date just after midnight", () => {
    // Arrange
    // Local midnight falls on previous day in every timezone ahead of UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2000, 2, 5, 0, 30));

    // Act & Assert
    expect(getTodayDateString()).toBe("2000-03-05");
  });

  it("returns local date just before midnight", () => {
    // Arrange
    // Local evening falls on next day in every timezone behind UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2000, 2, 5, 23, 30));

    // Act & Assert
    expect(getTodayDateString()).toBe("2000-03-05");
  });
});
