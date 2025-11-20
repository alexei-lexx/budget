/**
 * Calculate a specific percentile from a sorted array of numbers.
 * Uses the Tukey method for quartiles (Q1 and Q3).
 *
 * @param sortedData - Array of numbers sorted in ascending order
 * @param percentile - Percentile to calculate (0-100)
 * @returns The calculated percentile value
 */
export function calculatePercentile(
  sortedData: number[],
  percentile: number,
): number {
  if (sortedData.length === 0) {
    throw new Error("Cannot calculate percentile of empty array");
  }

  if (sortedData.length === 1) {
    return sortedData[0];
  }

  if (sortedData.length === 2) {
    // For 2 elements, use linear interpolation
    const fraction = percentile / 100;
    return sortedData[0] + fraction * (sortedData[1] - sortedData[0]);
  }

  // Use linear interpolation method (R type 7 / NumPy default)
  // This is the most common method used in statistical software
  const position = (percentile / 100) * (sortedData.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) {
    return sortedData[lower];
  }

  const lowerValue = sortedData[lower];
  const upperValue = sortedData[upper];
  const weight = position - lower;

  return lowerValue + weight * (upperValue - lowerValue);
}

/**
 * Result of outlier detection calculation.
 */
export interface OutlierResult {
  /** Transaction amounts classified as normal (not outliers) */
  normalAmounts: number[];
  /** Transaction amounts classified as outliers */
  outlierAmounts: number[];
  /** Count of outlier transactions */
  outlierCount: number;
  /** Sum of outlier transaction amounts */
  outlierTotal: number;
}

/**
 * Identify statistical outliers using the Interquartile Range (IQR) method.
 * Values above Q3 + 1.5×IQR are considered outliers.
 *
 * @param amounts - Array of transaction amounts
 * @returns OutlierResult with segregated normal and outlier amounts
 */
export function calculateOutliers(amounts: number[]): OutlierResult {
  // Edge case: insufficient data for statistical analysis
  if (amounts.length < 4) {
    return {
      normalAmounts: [...amounts],
      outlierAmounts: [],
      outlierCount: 0,
      outlierTotal: 0,
    };
  }

  // Sort data for quartile calculation
  const sorted = [...amounts].sort((a, b) => a - b);

  // Calculate quartiles
  const q1 = calculatePercentile(sorted, 25);
  const q3 = calculatePercentile(sorted, 75);
  const iqr = q3 - q1;

  // Calculate upper bound for outliers (Q3 + 1.5×IQR)
  // Note: We only check upper bound as we're interested in unusually HIGH expenses
  const upperBound = q3 + 1.5 * iqr;

  // Segregate normal vs outlier amounts
  const normalAmounts: number[] = [];
  const outlierAmounts: number[] = [];

  for (const amount of amounts) {
    if (amount > upperBound) {
      outlierAmounts.push(amount);
    } else {
      normalAmounts.push(amount);
    }
  }

  return {
    normalAmounts,
    outlierAmounts,
    outlierCount: outlierAmounts.length,
    outlierTotal: outlierAmounts.reduce((sum, val) => sum + val, 0),
  };
}
