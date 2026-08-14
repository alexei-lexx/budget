import { describe, it, expect } from "vitest";
import { formatMonthYear } from "./date";

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
