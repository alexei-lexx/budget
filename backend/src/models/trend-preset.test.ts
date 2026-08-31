import { faker } from "@faker-js/faker";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fakeCreateTrendPresetInput,
  fakeTrendPreset,
} from "../utils/test-utils/models/trend-preset-fakes";
import { ModelError } from "./model-error";
import { TrendPreset } from "./trend-preset";

describe("TrendPreset", () => {
  describe("create", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("builds trend preset with all fields populated", () => {
      // Arrange
      const userId = faker.string.uuid();
      const input = fakeCreateTrendPresetInput({
        userId,
        periodUnit: "MONTH",
        lookback: 6,
        currency: "EUR",
        categoryIds: ["category-1", "category-2"],
        includeUncategorized: true,
      });

      // Act
      const result = TrendPreset.create(input, {
        idGenerator: () => "fixed-uuid",
      });

      // Assert
      expect(result.toData()).toEqual({
        id: "fixed-uuid",
        userId,
        periodUnit: "MONTH",
        lookback: 6,
        currency: "EUR",
        categoryIds: ["category-1", "category-2"],
        includeUncategorized: true,
        createdAt: "2000-01-02T10:11:12.000Z",
      });
    });

    it("defaults categoryIds to empty array when omitted", () => {
      // Act
      const result = TrendPreset.create(
        fakeCreateTrendPresetInput({ categoryIds: undefined }),
      );

      // Assert
      expect(result.categoryIds).toEqual([]);
    });

    it("defaults includeUncategorized to undefined when omitted", () => {
      // Act
      const result = TrendPreset.create(
        fakeCreateTrendPresetInput({ includeUncategorized: undefined }),
      );

      // Assert
      expect(result.includeUncategorized).toBeUndefined();
    });

    it("uses default id generator when options omitted", () => {
      // Act
      const result = TrendPreset.create(fakeCreateTrendPresetInput());

      // Assert
      expect(result.id).toBeDefined();
    });

    // Validation failures

    it("throws when lookback is below 1", () => {
      // Act & Assert
      expect(() =>
        TrendPreset.create(fakeCreateTrendPresetInput({ lookback: 0 })),
      ).toThrow(new ModelError("Lookback must be a whole number from 1 to 12"));
    });

    it("throws when lookback is above 12", () => {
      // Act & Assert
      expect(() =>
        TrendPreset.create(fakeCreateTrendPresetInput({ lookback: 13 })),
      ).toThrow(new ModelError("Lookback must be a whole number from 1 to 12"));
    });

    it("throws when lookback is not integer", () => {
      // Act & Assert
      expect(() =>
        TrendPreset.create(fakeCreateTrendPresetInput({ lookback: 3.5 })),
      ).toThrow(new ModelError("Lookback must be a whole number from 1 to 12"));
    });

    it("throws when currency is empty", () => {
      // Act & Assert
      expect(() =>
        TrendPreset.create(fakeCreateTrendPresetInput({ currency: "" })),
      ).toThrow(new ModelError("Currency must not be empty"));
    });
  });

  describe("fromPersistence", () => {
    // Happy path

    it("reconstructs instance from data", () => {
      // Arrange
      const data = fakeTrendPreset().toData();

      // Act
      const result = TrendPreset.fromPersistence(data);

      // Assert
      expect(result.toData()).toEqual(data);
    });

    // Validation failures

    it("throws when lookback is out of range", () => {
      // Arrange
      const data = { ...fakeTrendPreset().toData(), lookback: 13 };

      // Act & Assert
      expect(() => TrendPreset.fromPersistence(data)).toThrow(
        new ModelError("Lookback must be a whole number from 1 to 12"),
      );
    });

    it("throws when currency is empty", () => {
      // Arrange
      const data = { ...fakeTrendPreset().toData(), currency: "" };

      // Act & Assert
      expect(() => TrendPreset.fromPersistence(data)).toThrow(
        new ModelError("Currency must not be empty"),
      );
    });
  });
});
