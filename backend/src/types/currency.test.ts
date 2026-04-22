import { describe, expect, it } from "@jest/globals";
import { SUPPORTED_CURRENCIES, isSupportedCurrency } from "./currency";

describe("SUPPORTED_CURRENCIES", () => {
  it("is non-empty", () => {
    // Act & Assert
    expect(SUPPORTED_CURRENCIES.length).toBeGreaterThan(0);
  });

  it("includes EUR and USD", () => {
    // Act & Assert
    expect(SUPPORTED_CURRENCIES).toContain("EUR");
    expect(SUPPORTED_CURRENCIES).toContain("USD");
  });

  it("is sorted alphabetically", () => {
    // Arrange
    const sorted = [...SUPPORTED_CURRENCIES].sort();

    // Act & Assert
    expect(SUPPORTED_CURRENCIES).toEqual(sorted);
  });
});

describe("isSupportedCurrency", () => {
  // Happy path

  it("returns true for USD", () => {
    // Act & Assert
    expect(isSupportedCurrency("USD")).toBe(true);
  });

  it("returns true for EUR", () => {
    // Act & Assert
    expect(isSupportedCurrency("EUR")).toBe(true);
  });

  // Validation failures

  it("returns false for non-ISO code", () => {
    // Act & Assert
    expect(isSupportedCurrency("INVALID")).toBe(false);
  });

  it("returns false for lowercase input", () => {
    // Act & Assert
    expect(isSupportedCurrency("usd")).toBe(false);
  });

  it("returns false for input with surrounding whitespace", () => {
    // Act & Assert
    expect(isSupportedCurrency(" USD ")).toBe(false);
  });

  it("returns false for empty string", () => {
    // Act & Assert
    expect(isSupportedCurrency("")).toBe(false);
  });
});
