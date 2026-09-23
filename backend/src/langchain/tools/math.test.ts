import { describe, expect, it } from "vitest";
import { BusinessError } from "../../services/business-error";
import { avgTool, calculateTool, sumTool } from "./math";

describe("sumTool", () => {
  // Happy path

  it("has correct name", () => {
    // Act & Assert
    expect(sumTool.name).toBe("sum");
  });

  it("sums array of numbers", async () => {
    // Act
    const result = await sumTool.invoke({ numbers: [1, 2, 3, 4, 5] });

    // Assert
    expect(result).toBe(15);
  });

  it("returns 0 for empty array", async () => {
    // Act
    const result = await sumTool.invoke({ numbers: [] });

    // Assert
    expect(result).toBe(0);
  });

  it("handles decimal numbers", async () => {
    // Act
    const result = await sumTool.invoke({ numbers: [10.5, 20.3, 15.0] });

    // Assert
    expect(result).toBe(45.8);
  });
});

describe("avgTool", () => {
  // Happy path

  it("has correct name", () => {
    // Act & Assert
    expect(avgTool.name).toBe("avg");
  });

  it("calculates average of array of numbers", async () => {
    // Act
    const result = await avgTool.invoke({ numbers: [10, 20, 30] });

    // Assert
    expect(result).toBe(20);
  });

  // Validation failures

  it("throws for empty array", async () => {
    // Act
    const promise = avgTool.invoke({ numbers: [] });

    // Assert
    await expect(promise).rejects.toThrow(
      new BusinessError("Cannot calculate average of an empty array"),
    );
  });
});

describe("calculateTool", () => {
  // Happy path

  it("has correct name", () => {
    // Act & Assert
    expect(calculateTool.name).toBe("calculate");
  });

  it("evaluates mathematical expression", async () => {
    // Act
    const result = await calculateTool.invoke({
      expression: "(45.8 / 200) * 100",
    });

    // Assert
    expect(result).toBe(22.9);
  });

  // Validation failures

  it("throws for non-numeric results", async () => {
    // Act
    const promise = calculateTool.invoke({ expression: "sqrt(-1)" });

    // Assert
    await expect(promise).rejects.toThrow(BusinessError);
  });
});
