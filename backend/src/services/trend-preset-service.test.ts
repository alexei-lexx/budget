import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { TrendPresetRepository } from "../ports/trend-preset-repository";
import { fakeTrendPreset } from "../utils/test-utils/models/trend-preset-fakes";
import { createMockTrendPresetRepository } from "../utils/test-utils/repositories/trend-preset-repository-mocks";
import { fakeCreateTrendPresetServiceInput } from "../utils/test-utils/services/trend-preset-service-fakes";
import { TrendPresetService } from "./trend-preset-service";

describe("TrendPresetService", () => {
  let trendPresetRepository: Mocked<TrendPresetRepository>;
  let service: TrendPresetService;

  const userId = faker.string.uuid();

  beforeEach(() => {
    trendPresetRepository = createMockTrendPresetRepository();
    service = new TrendPresetService(trendPresetRepository);
  });

  describe("getTrendPresetsByUser", () => {
    // Happy path

    it("returns user's trend presets", async () => {
      // Arrange
      const trendPresets = [
        fakeTrendPreset({ userId }),
        fakeTrendPreset({ userId }),
      ];
      trendPresetRepository.findManyByUserId.mockResolvedValue(trendPresets);

      // Act
      const result = await service.getTrendPresetsByUser(userId);

      // Assert
      expect(result).toEqual({
        success: true,
        data: trendPresets,
      });
      expect(trendPresetRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it("returns empty array when user has no trend presets", async () => {
      // Arrange
      trendPresetRepository.findManyByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getTrendPresetsByUser(userId);

      // Assert
      expect(result).toEqual({ success: true, data: [] });
    });
  });

  describe("createTrendPreset", () => {
    // Happy path

    it("creates and returns new trend preset", async () => {
      // Arrange
      const input = fakeCreateTrendPresetServiceInput({
        periodUnit: "MONTH",
        lookback: 6,
        currency: "EUR",
        categoryIds: ["category-1"],
      });

      // Act
      const result = await service.createTrendPreset(userId, input);

      // Assert
      expect(result.success).toBe(true);
      expect(trendPresetRepository.create).toHaveBeenCalledTimes(1);
      const created = trendPresetRepository.create.mock.calls[0]?.[0];
      expect(created?.userId).toBe(userId);
      expect(created?.periodUnit).toBe("MONTH");
      expect(created?.lookback).toBe(6);
      expect(created?.currency).toBe("EUR");
      expect(created?.categoryIds).toEqual(["category-1"]);
    });

    // Validation failures

    it("returns failure when lookback is out of range", async () => {
      // Arrange
      const input = fakeCreateTrendPresetServiceInput({ lookback: 13 });

      // Act
      const result = await service.createTrendPreset(userId, input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Lookback must be a whole number from 1 to 12",
      });
      expect(trendPresetRepository.create).not.toHaveBeenCalled();
    });

    // Dependency failures

    it("rethrows error from repository", async () => {
      // Arrange
      const input = fakeCreateTrendPresetServiceInput();
      // Repository fails unexpectedly
      const error = new Error("Repository failure");
      trendPresetRepository.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.createTrendPreset(userId, input)).rejects.toThrow(
        error,
      );
    });
  });

  describe("deleteTrendPreset", () => {
    // Happy path

    it("deletes trend preset scoped to caller's userId", async () => {
      // Arrange
      // Id of entry to delete, regardless of who actually owns it —
      // deletion is always scoped to authenticated caller's userId
      const id = faker.string.uuid();

      // Act
      const result = await service.deleteTrendPreset(userId, id);

      // Assert
      expect(result).toEqual({ success: true, data: true });
      expect(trendPresetRepository.deleteOneById).toHaveBeenCalledWith({
        id,
        userId,
      });
    });
  });
});
