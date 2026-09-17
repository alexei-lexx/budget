/**
 * Computes median of numeric values.
 *
 * @param values - Numbers to compute median from
 * @returns Median value, or 0 if values is empty
 */
export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    const middleValue = sorted[middle];
    if (middleValue === undefined) {
      throw new Error("median: unexpected out-of-bounds index");
    }
    return middleValue;
  }

  const lowerValue = sorted[middle - 1];
  const upperValue = sorted[middle];
  if (lowerValue === undefined || upperValue === undefined) {
    throw new Error("median: unexpected out-of-bounds index");
  }
  return (lowerValue + upperValue) / 2;
}
