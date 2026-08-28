import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { StarredTrendRepository } from "../ports/starred-trend-repository";
import { toDateTimeString } from "../types/date-time-string";
import { fakeStarredTrend } from "../utils/test-utils/models/starred-trend-fakes";
import { createMockStarredTrendRepository } from "../utils/test-utils/repositories/starred-trend-repository-mocks";
import { StarredTrendService } from "./starred-trend-service";

describe("StarredTrendService", () => {
  let starredTrendRepository: Mocked<StarredTrendRepository>;
  let service: StarredTrendService;

  const userId = faker.string.uuid();

  beforeEach(() => {
    starredTrendRepository = createMockStarredTrendRepository();
    service = new StarredTrendService(starredTrendRepository);
  });

  describe("listStarredTrends", () => {
    // Happy path

    it("returns starred trends most recently starred first", async () => {
      // Arrange
      const older = fakeStarredTrend({
        userId,
        createdAt: toDateTimeString("2000-01-01T00:00:00.000Z"),
      });
      const newer = fakeStarredTrend({
        userId,
        createdAt: toDateTimeString("2000-06-01T00:00:00.000Z"),
      });
      starredTrendRepository.findManyByUserId.mockResolvedValue([older, newer]);

      // Act
      const result = await service.listStarredTrends(userId);

      // Assert
      expect(result).toEqual({
        success: true,
        data: [newer, older],
      });
      expect(starredTrendRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it("returns empty array when user has no starred trends", async () => {
      // Arrange
      starredTrendRepository.findManyByUserId.mockResolvedValue([]);

      // Act
      const result = await service.listStarredTrends(userId);

      // Assert
      expect(result).toEqual({ success: true, data: [] });
    });
  });

  describe("starTrend", () => {
    // Happy path

    it("creates and returns new starred trend when no matching configuration exists", async () => {
      // Arrange
      // No previously starred configurations
      starredTrendRepository.findManyByUserId.mockResolvedValue([]);

      // Act
      const result = await service.starTrend(userId, {
        periodUnit: "MONTH",
        lookback: 6,
        currency: "EUR",
        categoryIds: ["category-1"],
        includeUncategorized: false,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(starredTrendRepository.create).toHaveBeenCalledTimes(1);
      const created = starredTrendRepository.create.mock.calls[0]?.[0];
      expect(created?.userId).toBe(userId);
      expect(created?.periodUnit).toBe("MONTH");
      expect(created?.lookback).toBe(6);
      expect(created?.currency).toBe("EUR");
      expect(created?.categoryIds).toEqual(["category-1"]);
    });

    it("returns existing starred trend when configuration already matches", async () => {
      // Arrange
      // Already-starred configuration with same categories in different order
      const existing = fakeStarredTrend({
        userId,
        periodUnit: "MONTH",
        lookback: 6,
        currency: "EUR",
        categoryIds: ["category-1", "category-2"],
        includeUncategorized: false,
      });
      starredTrendRepository.findManyByUserId.mockResolvedValue([existing]);

      // Act
      const result = await service.starTrend(userId, {
        periodUnit: "MONTH",
        lookback: 6,
        currency: "EUR",
        categoryIds: ["category-2", "category-1"],
        includeUncategorized: false,
      });

      // Assert
      expect(result).toEqual({ success: true, data: existing });
      expect(starredTrendRepository.create).not.toHaveBeenCalled();
    });

    // Validation failures

    it("returns failure when lookback is out of range", async () => {
      // Arrange
      starredTrendRepository.findManyByUserId.mockResolvedValue([]);

      // Act
      const result = await service.starTrend(userId, {
        periodUnit: "MONTH",
        lookback: 13,
        currency: "EUR",
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Lookback must be a whole number from 1 to 12",
      });
      expect(starredTrendRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("unstarTrend", () => {
    // Happy path

    it("deletes starred trend scoped to caller's userId", async () => {
      // Arrange
      // Id of the entry to unstar, regardless of who actually owns it —
      // deletion is always scoped to the authenticated caller's userId
      const id = faker.string.uuid();

      // Act
      const result = await service.unstarTrend(userId, id);

      // Assert
      expect(result).toEqual({ success: true, data: true });
      expect(starredTrendRepository.deleteOneById).toHaveBeenCalledWith({
        id,
        userId,
      });
    });
  });
});
