import {
  InvalidDateStringError,
  isDateString,
  toDateString,
  toDateStringOrUndefined,
} from "./date";

describe("InvalidDateStringError", () => {
  it("is an Error instance", () => {
    const error = new InvalidDateStringError("invalid-date");
    expect(error).toBeInstanceOf(Error);
  });

  it("has correct name property", () => {
    const error = new InvalidDateStringError("invalid-date");
    expect(error.name).toBe("InvalidDateStringError");
  });

  it("builds message from value parameter", () => {
    const error = new InvalidDateStringError("2000-13-31");
    expect(error.message).toBe(
      'Invalid date format: "2000-13-31". Expected YYYY-MM-DD.',
    );
  });
});

describe("isDateString", () => {
  describe("valid dates", () => {
    it("returns true for a valid date", () => {
      expect(isDateString("2000-01-02")).toBe(true);
    });

    it("returns true for leap day in a leap year", () => {
      expect(isDateString("2024-02-29")).toBe(true);
    });
  });

  describe("wrong format", () => {
    it("returns false for ISO datetime string", () => {
      expect(isDateString("2000-01-15T00:00:00.000Z")).toBe(false);
    });

    it("returns false for slash-separated date", () => {
      expect(isDateString("2000/01/15")).toBe(false);
    });

    it("returns false for dot-separated date", () => {
      expect(isDateString("15.01.2000")).toBe(false);
    });

    it("returns false for date without leading zeros", () => {
      expect(isDateString("2000-1-5")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isDateString("")).toBe(false);
    });
  });

  describe("non-existent dates", () => {
    it("returns false for Feb 29 in a non-leap year", () => {
      expect(isDateString("2003-02-29")).toBe(false);
    });

    it("returns false for month 13", () => {
      expect(isDateString("2000-13-01")).toBe(false);
    });

    it("returns false for day 32", () => {
      expect(isDateString("2000-01-32")).toBe(false);
    });

    it("returns false for day 31 in a 30-day month", () => {
      expect(isDateString("2000-04-31")).toBe(false);
    });
  });
});

describe("toDateString", () => {
  it("returns the value unchanged for a valid date", () => {
    expect(toDateString("2000-01-15")).toBe("2000-01-15");
  });

  it("throws InvalidDateStringError for an invalid date format", () => {
    expect(() => toDateString("15/01/2000")).toThrow(InvalidDateStringError);
  });

  it("throws InvalidDateStringError with correct message", () => {
    expect(() => toDateString("15/01/2000")).toThrow(
      'Invalid date format: "15/01/2000". Expected YYYY-MM-DD.',
    );
  });

  it("throws InvalidDateStringError for a non-existent date", () => {
    expect(() => toDateString("2000-13-31")).toThrow(InvalidDateStringError);
  });

  it("throws InvalidDateStringError for an empty string", () => {
    expect(() => toDateString("")).toThrow(InvalidDateStringError);
  });
});

describe("toDateStringOrUndefined", () => {
  it("returns undefined for undefined input", () => {
    expect(toDateStringOrUndefined(undefined)).toBeUndefined();
  });

  it("returns undefined for null input", () => {
    expect(toDateStringOrUndefined(null)).toBeUndefined();
  });

  it("returns the value unchanged for a valid date", () => {
    expect(toDateStringOrUndefined("2000-01-15")).toBe("2000-01-15");
  });

  it("throws InvalidDateStringError for an invalid date format", () => {
    expect(() => toDateStringOrUndefined("15/01/2000")).toThrow(
      InvalidDateStringError,
    );
  });
});
