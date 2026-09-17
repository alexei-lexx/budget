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

  return sorted.length % 2 === 0
    ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (sorted[middle - 1]! + sorted[middle]!) / 2
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      sorted[middle]!;
}
