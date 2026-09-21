import { describe, it, expect } from "vitest";
import {
  isEmptyTransactionFilterSelection,
  type TransactionFilterSelection,
} from "./transactionFilters";

describe("isEmptyTransactionFilterSelection", () => {
  const emptyValue: TransactionFilterSelection = {
    accountIds: [],
    categoryIds: [],
    includeUncategorized: false,
    dateAfter: null,
    dateBefore: null,
    types: [],
  };

  it("returns true when no fields are set", () => {
    // Act & Assert
    expect(isEmptyTransactionFilterSelection(emptyValue)).toBe(true);
  });

  it("returns false when accountIds is set", () => {
    // Arrange
    const selection = { ...emptyValue, accountIds: ["account-1"] };

    // Act & Assert
    expect(isEmptyTransactionFilterSelection(selection)).toBe(false);
  });

  it("returns false when categoryIds is set", () => {
    // Arrange
    const selection = { ...emptyValue, categoryIds: ["category-1"] };

    // Act & Assert
    expect(isEmptyTransactionFilterSelection(selection)).toBe(false);
  });

  it("returns false when includeUncategorized is true", () => {
    // Arrange
    const selection = { ...emptyValue, includeUncategorized: true };

    // Act & Assert
    expect(isEmptyTransactionFilterSelection(selection)).toBe(false);
  });

  it("returns false when dateAfter is set", () => {
    // Arrange
    const selection = { ...emptyValue, dateAfter: "2026-01-01" };

    // Act & Assert
    expect(isEmptyTransactionFilterSelection(selection)).toBe(false);
  });

  it("returns false when dateBefore is set", () => {
    // Arrange
    const selection = { ...emptyValue, dateBefore: "2026-01-31" };

    // Act & Assert
    expect(isEmptyTransactionFilterSelection(selection)).toBe(false);
  });

  it("returns false when types is set", () => {
    // Arrange
    const selection: TransactionFilterSelection = { ...emptyValue, types: ["EXPENSE"] };

    // Act & Assert
    expect(isEmptyTransactionFilterSelection(selection)).toBe(false);
  });

  it("returns false when every field is set", () => {
    // Arrange
    const selection: TransactionFilterSelection = {
      accountIds: ["account-1"],
      categoryIds: ["category-1"],
      includeUncategorized: true,
      dateAfter: "2026-01-01",
      dateBefore: "2026-01-31",
      types: ["EXPENSE"],
    };

    // Act & Assert
    expect(isEmptyTransactionFilterSelection(selection)).toBe(false);
  });
});
