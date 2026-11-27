/**
 * Computes arithmetic mean of numeric values.
 *
 * @param values - Numbers to compute mean from
 * @returns Mean value, or 0 if values is empty
 */
export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);

  return total / values.length;
}
