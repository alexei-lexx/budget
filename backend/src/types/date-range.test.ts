import { toDateString } from "./date";
import { toDateRange } from "./date-range";

describe("toDateRange", () => {
  it("returns the range unchanged for valid ordered dates", () => {
    const range = toDateRange(
      toDateString("2000-01-01"),
      toDateString("2000-01-31"),
    );
    expect(range.startDate).toBe("2000-01-01");
    expect(range.endDate).toBe("2000-01-31");
  });

  it("accepts equal start and end dates", () => {
    const range = toDateRange(
      toDateString("2000-01-01"),
      toDateString("2000-01-01"),
    );
    expect(range.startDate).toBe("2000-01-01");
    expect(range.endDate).toBe("2000-01-01");
  });

  it("throws when startDate is after endDate", () => {
    expect(() =>
      toDateRange(toDateString("2000-01-31"), toDateString("2000-01-01")),
    ).toThrow("Invalid date range: start 2000-01-31 is after end 2000-01-01");
  });
});
