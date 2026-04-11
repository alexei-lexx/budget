import { describe, expect, it } from "@jest/globals";
import { avgTool, calculateTool, sumTool } from "./math";

describe("sumTool", () => {
  it("should have correct name", () => {
    expect(sumTool.name).toBe("sum");
  });

  it("should sum an array of numbers", async () => {
    const result = await sumTool.invoke({ numbers: [1, 2, 3, 4, 5] });

    expect(result).toEqual({ success: true, data: 15 });
  });

  it("should return 0 for an empty array", async () => {
    const result = await sumTool.invoke({ numbers: [] });

    expect(result).toEqual({ success: true, data: 0 });
  });

  it("should handle decimal numbers", async () => {
    const result = await sumTool.invoke({ numbers: [10.5, 20.3, 15.0] });

    expect((result as { success: true; data: number }).data).toBeCloseTo(45.8);
  });
});

describe("avgTool", () => {
  it("should have correct name", () => {
    expect(avgTool.name).toBe("avg");
  });

  it("should calculate the average of an array of numbers", async () => {
    const result = await avgTool.invoke({ numbers: [10, 20, 30] });

    expect(result).toEqual({ success: true, data: 20 });
  });

  it("should return failure for an empty array", async () => {
    const result = await avgTool.invoke({ numbers: [] });

    expect(result).toEqual({
      success: false,
      error: "Cannot calculate average of an empty array",
    });
  });
});

describe("calculateTool", () => {
  it("should have correct name", () => {
    expect(calculateTool.name).toBe("calculate");
  });

  it("should evaluate a mathematical expression", async () => {
    const result = await calculateTool.invoke({
      expression: "(45.8 / 200) * 100",
    });

    expect((result as { success: true; data: number }).data).toBeCloseTo(22.9);
  });

  it("should return failure for non-numeric results", async () => {
    const result = await calculateTool.invoke({ expression: "sqrt(-1)" });

    expect((result as { success: false; error: string }).success).toBe(false);
  });
});
