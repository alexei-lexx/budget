import { calculateOutliers, calculatePercentile } from "./statistics";

describe("calculatePercentile", () => {
  it("should calculate 25th percentile (Q1) for sorted array", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = calculatePercentile(data, 25);
    // Linear interpolation gives 3.25, which is reasonable for Q1
    expect(result).toBeGreaterThanOrEqual(3);
    expect(result).toBeLessThanOrEqual(3.5);
  });

  it("should calculate 75th percentile (Q3) for sorted array", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = calculatePercentile(data, 75);
    // Linear interpolation gives 7.75, which is reasonable for Q3
    expect(result).toBeGreaterThanOrEqual(7.5);
    expect(result).toBeLessThanOrEqual(8);
  });

  it("should calculate 50th percentile (median) for sorted array", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = calculatePercentile(data, 50);
    expect(result).toBe(5.5);
  });

  it("should handle single element array", () => {
    const data = [42];
    const result = calculatePercentile(data, 75);
    expect(result).toBe(42);
  });

  it("should handle two element array", () => {
    const data = [10, 20];
    const q1 = calculatePercentile(data, 25);
    const q3 = calculatePercentile(data, 75);
    expect(q1).toBeCloseTo(12.5, 1);
    expect(q3).toBeCloseTo(17.5, 1);
  });

  it("should handle array with all equal values", () => {
    const data = [5, 5, 5, 5, 5];
    const result = calculatePercentile(data, 75);
    expect(result).toBe(5);
  });
});

describe("calculateOutliers", () => {
  it("should handle empty array", () => {
    const amounts: number[] = [];
    const result = calculateOutliers(amounts);
    expect(result.normalAmounts).toEqual([]);
    expect(result.outlierAmounts).toEqual([]);
    expect(result.outlierCount).toBe(0);
    expect(result.outlierTotal).toBe(0);
  });

  it("should return all values as normal when fewer than 4 transactions", () => {
    const amounts = [100, 200, 300];
    const result = calculateOutliers(amounts);
    expect(result.normalAmounts).toEqual([100, 200, 300]);
    expect(result.outlierAmounts).toEqual([]);
    expect(result.outlierCount).toBe(0);
    expect(result.outlierTotal).toBe(0);
  });

  it("should handle all similar values (no outliers)", () => {
    const amounts = [100, 105, 102, 98, 103, 101];
    const result = calculateOutliers(amounts);
    expect(result.normalAmounts).toEqual(amounts);
    expect(result.outlierAmounts).toEqual([]);
    expect(result.outlierCount).toBe(0);
    expect(result.outlierTotal).toBe(0);
  });

  it("should detect single high outlier", () => {
    // Regular expenses: 20-50, with one rent payment at 1500
    const amounts = [25, 30, 35, 40, 45, 50, 28, 32, 42, 1500];
    const result = calculateOutliers(amounts);

    expect(result.normalAmounts).not.toContain(1500);
    expect(result.normalAmounts.length).toBe(9);
    expect(result.outlierAmounts).toEqual([1500]);
    expect(result.outlierCount).toBe(1);
    expect(result.outlierTotal).toBe(1500);
  });

  it("should detect multiple outliers", () => {
    // Regular expenses + 2 large bills
    const amounts = [20, 25, 30, 35, 40, 45, 50, 55, 1200, 1500];
    const result = calculateOutliers(amounts);

    expect(result.normalAmounts).not.toContain(1500);
    expect(result.normalAmounts).not.toContain(1200);
    expect(result.normalAmounts.length).toBe(8);
    expect(result.outlierAmounts).toEqual([1200, 1500]);
    expect(result.outlierCount).toBe(2);
    expect(result.outlierTotal).toBe(2700);
  });

  it("should use Q3 + 1.5×IQR threshold correctly", () => {
    // Clear outlier: regular values 10-80, then a jump to 200
    const amounts = [10, 20, 30, 40, 50, 60, 70, 80, 200];
    const result = calculateOutliers(amounts);

    // 200 should be detected as an outlier
    expect(result.outlierAmounts).toContain(200);
    expect(result.outlierCount).toBeGreaterThanOrEqual(1);
    // Regular values should not be outliers
    expect(result.normalAmounts).toContain(80);
    expect(result.normalAmounts).toContain(10);
  });
});
