import { describe, expect, it } from "vitest";
import { median } from "./median";

describe("median", () => {
  it("returns 0 for empty array", () => {
    expect(median([])).toBe(0);
  });

  it("returns value for single element array", () => {
    expect(median([5])).toBe(5);
  });

  it("returns middle value for odd length array", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it("returns average of two middle values for even length array", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("does not mutate input array", () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
  });
});
