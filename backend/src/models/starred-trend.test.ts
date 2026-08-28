import { faker } from "@faker-js/faker";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fakeCreateStarredTrendInput,
  fakeStarredTrend,
} from "../utils/test-utils/models/starred-trend-fakes";
import { ModelError } from "./model-error";
import { StarredTrend } from "./starred-trend";

describe("StarredTrend", () => {
  describe("create", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("builds starred trend with all fields populated", () => {
      // Arrange
      const userId = faker.string.uuid();
      const input = fakeCreateStarredTrendInput({
        userId,
        periodUnit: "MONTH",
        lookback: 6,
        currency: "EUR",
        categoryIds: ["category-1", "category-2"],
        includeUncategorized: true,
      });

      // Act
      const result = StarredTrend.create(input, {
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
      const result = StarredTrend.create(
        fakeCreateStarredTrendInput({ categoryIds: undefined }),
      );

      // Assert
      expect(result.categoryIds).toEqual([]);
    });

    it("defaults includeUncategorized to false when omitted", () => {
      // Act
      const result = StarredTrend.create(
        fakeCreateStarredTrendInput({ includeUncategorized: undefined }),
      );

      // Assert
      expect(result.includeUncategorized).toBe(false);
    });

    it("uses default id generator when options omitted", () => {
      // Act
      const result = StarredTrend.create(fakeCreateStarredTrendInput());

      // Assert
      expect(result.id).toBeDefined();
    });

    // Validation failures

    it("throws when lookback is below 1", () => {
      // Act & Assert
      expect(() =>
        StarredTrend.create(fakeCreateStarredTrendInput({ lookback: 0 })),
      ).toThrow(ModelError);
    });

    it("throws when lookback is above 12", () => {
      // Act & Assert
      expect(() =>
        StarredTrend.create(fakeCreateStarredTrendInput({ lookback: 13 })),
      ).toThrow(ModelError);
    });

    it("throws when lookback is not integer", () => {
      // Act & Assert
      expect(() =>
        StarredTrend.create(fakeCreateStarredTrendInput({ lookback: 3.5 })),
      ).toThrow(ModelError);
    });

    it("throws when currency is empty", () => {
      // Act & Assert
      expect(() =>
        StarredTrend.create(fakeCreateStarredTrendInput({ currency: "" })),
      ).toThrow(ModelError);
    });
  });

  describe("fromPersistence", () => {
    // Happy path

    it("reconstructs instance from data", () => {
      // Arrange
      const data = fakeStarredTrend().toData();

      // Act
      const result = StarredTrend.fromPersistence(data);

      // Assert
      expect(result.toData()).toEqual(data);
    });

    // Validation failures

    it("throws on invalid period unit", () => {
      // Arrange
      const data = {
        ...fakeStarredTrend().toData(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        periodUnit: "YEAR" as any,
      };

      // Act & Assert
      expect(() => StarredTrend.fromPersistence(data)).toThrow(ModelError);
    });

    it("throws when lookback is out of range", () => {
      // Arrange
      const data = { ...fakeStarredTrend().toData(), lookback: 13 };

      // Act & Assert
      expect(() => StarredTrend.fromPersistence(data)).toThrow(ModelError);
    });

    it("throws when currency is empty", () => {
      // Arrange
      const data = { ...fakeStarredTrend().toData(), currency: "" };

      // Act & Assert
      expect(() => StarredTrend.fromPersistence(data)).toThrow(ModelError);
    });
  });
});
