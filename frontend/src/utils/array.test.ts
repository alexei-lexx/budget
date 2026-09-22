import { describe, it, expect } from "vitest";
import { haveSameItems } from "./array";

describe("haveSameItems", () => {
  // Happy path

  it("returns true for identical arrays", () => {
    // Act & Assert
    expect(haveSameItems(["a", "b"], ["a", "b"])).toBe(true);
  });

  it("returns true for same items in different order", () => {
    // Act & Assert
    expect(haveSameItems(["a", "b"], ["b", "a"])).toBe(true);
  });

  it("returns true for two empty arrays", () => {
    // Act & Assert
    expect(haveSameItems([], [])).toBe(true);
  });

  it("returns false when arrays have different lengths", () => {
    // Act & Assert
    expect(haveSameItems(["a", "b"], ["a"])).toBe(false);
  });

  it("returns false when arrays have same length but different items", () => {
    // Act & Assert
    expect(haveSameItems(["a", "b"], ["a", "c"])).toBe(false);
  });
});
