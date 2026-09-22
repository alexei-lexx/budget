/**
 * Returns true if both arrays contain exactly the same items, regardless of order.
 */
export function haveSameItems(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bItems = new Set(b);
  return a.every((item) => bItems.has(item));
}
