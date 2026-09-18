import { describe, it, expect, beforeEach } from "vitest";
import { trendSelectionStorage } from "./trendSelectionStorage";
import type { TrendSelection } from "@/composables/useExpenseTrend";

describe("trendSelectionStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const validSelection: TrendSelection = {
    periodUnit: "WEEK",
    lookback: 12,
    currency: "USD",
    categoryIds: ["cat-1", "cat-2"],
    includeUncategorized: true,
  };

  describe("read", () => {
    // Happy path

    it("returns previously written selection", () => {
      // Arrange
      const selection: TrendSelection = {
        ...validSelection,
      };
      trendSelectionStorage.write(selection);

      // Act
      const result = trendSelectionStorage.read();

      // Assert
      expect(result).toEqual(selection);
    });

    // Validation failures

    it("returns nothing when no value is stored", () => {
      // Act
      const result = trendSelectionStorage.read();

      // Assert
      expect(result).toBeUndefined();
    });

    it("returns nothing when stored value is unparsable", () => {
      // Arrange
      localStorage.setItem("budget:trendSelection", "not json");

      // Act
      const result = trendSelectionStorage.read();

      // Assert
      expect(result).toBeUndefined();
    });

    it("falls back to default period unit when stored value is invalid", () => {
      // Arrange
      localStorage.setItem(
        "budget:trendSelection",
        JSON.stringify({
          ...validSelection,
          periodUnit: "not period unit",
        }),
      );

      // Act
      const result = trendSelectionStorage.read();

      // Assert
      expect(result?.periodUnit).toBe("MONTH");
    });

    it("falls back to default lookback when stored value is out of range", () => {
      // Arrange
      localStorage.setItem(
        "budget:trendSelection",
        JSON.stringify({
          ...validSelection,
          lookback: 99,
        }),
      );

      // Act
      const result = trendSelectionStorage.read();

      // Assert
      expect(result?.lookback).toBe(3);
      expect(result?.periodUnit).toBe("WEEK");
    });
  });

  describe("write", () => {
    // Happy path

    it("stores full selection under prefixed key", () => {
      // Arrange
      const selection: TrendSelection = {
        ...validSelection,
      };

      // Act
      trendSelectionStorage.write(selection);

      // Assert
      expect(localStorage.getItem("budget:trendSelection")).toBe(JSON.stringify(selection));
    });
  });
});
