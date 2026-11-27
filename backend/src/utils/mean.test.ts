import { describe, expect, it } from "vitest";
import { mean } from "./mean";

describe("mean", () => {
  it("returns 0 for empty array", () => {
    expect(mean([])).toBe(0);
  });

  it("returns value for single element array", () => {
    expect(mean([5])).toBe(5);
  });

  it("returns arithmetic mean of several values", () => {
    expect(mean([100, 200, 600])).toBe(300);
  });

  it("returns fractional mean without rounding", () => {
    expect(mean([1, 2])).toBe(1.5);
  });
});
