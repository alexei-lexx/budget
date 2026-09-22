/**
 * Returns true if both arrays contain exactly the same items, regardless of order.
 */
export function haveSameItems(left: unknown[], right: unknown[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightItems = new Set(right);
  return left.every((item) => rightItems.has(item));
}
