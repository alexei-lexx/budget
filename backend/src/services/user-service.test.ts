import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { UserRepository } from "../ports/user-repository";
import { fakeUser } from "../utils/test-utils/models/user-fakes";
import { createMockUserRepository } from "../utils/test-utils/repositories/user-repository-mocks";
import {
  DEFAULT_TRANSACTION_PATTERNS_LIMIT,
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_TRANSACTION_PATTERNS_LIMIT,
} from "./transaction-service";
import { UserService } from "./user-service";

describe("UserService", () => {
  let service: UserService;
  let mockUserRepository: Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    service = new UserService(mockUserRepository);
  });

  describe("getSettings", () => {
    // Happy path

    it("returns settings for existing user", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const user = fakeUser({
        id: userId,
        transactionPatternsLimit: 5,
        voiceInputLanguage: "pl-PL",
      });
      // Returns user with saved settings
      mockUserRepository.findOneById.mockResolvedValue(user);

      // Act
      const result = await service.getSettings(userId);

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          transactionPatternsLimit: 5,
          voiceInputLanguage: "pl-PL",
        },
      });
      expect(mockUserRepository.findOneById).toHaveBeenCalledWith(userId);
    });

    it("returns defaults when no settings are saved", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const user = fakeUser({ id: userId });
      // Returns user without saved settings
      mockUserRepository.findOneById.mockResolvedValue(user);

      // Act
      const result = await service.getSettings(userId);

      // Assert
      expect(result).toStrictEqual({
        success: true,
        data: {
          transactionPatternsLimit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          voiceInputLanguage: undefined,
        },
      });
      expect(mockUserRepository.findOneById).toHaveBeenCalledWith(userId);
    });

    // Validation failures

    it("returns failure when userId is empty", async () => {
      // Act
      const result = await service.getSettings("");

      // Assert
      expect(result).toEqual({ success: false, error: "User ID is required" });
      expect(mockUserRepository.findOneById).not.toHaveBeenCalled();
    });

    it("returns failure when user is not found", async () => {
      // Arrange
      const userId = faker.string.uuid();
      // Returns no user for given id
      mockUserRepository.findOneById.mockResolvedValue(null);

      // Act
      const result = await service.getSettings(userId);

      // Assert
      expect(result).toEqual({ success: false, error: "User not found" });
      expect(mockUserRepository.findOneById).toHaveBeenCalledWith(userId);
    });
  });

  describe("updateSettings", () => {
    // Happy path

    it("updates voiceInputLanguage", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const updated = fakeUser({ id: userId, voiceInputLanguage: "de-DE" });
      // Persists and returns updated user
      mockUserRepository.update.mockResolvedValue(updated);

      // Act
      const result = await service.updateSettings({
        userId,
        voiceInputLanguage: "de-DE",
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          transactionPatternsLimit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          voiceInputLanguage: "de-DE",
        },
      });
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        voiceInputLanguage: "de-DE",
      });
    });

    it("updates transactionPatternsLimit", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const updated = fakeUser({ id: userId, transactionPatternsLimit: 7 });
      // Persists and returns updated user
      mockUserRepository.update.mockResolvedValue(updated);

      // Act
      const result = await service.updateSettings({
        userId,
        transactionPatternsLimit: 7,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: { transactionPatternsLimit: 7, voiceInputLanguage: undefined },
      });
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        transactionPatternsLimit: 7,
      });
    });

    it("updates both fields at once", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const updated = fakeUser({
        id: userId,
        transactionPatternsLimit: 5,
        voiceInputLanguage: "en-US",
      });
      // Persists and returns updated user
      mockUserRepository.update.mockResolvedValue(updated);

      // Act
      const result = await service.updateSettings({
        userId,
        transactionPatternsLimit: 5,
        voiceInputLanguage: "en-US",
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          transactionPatternsLimit: 5,
          voiceInputLanguage: "en-US",
        },
      });
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        transactionPatternsLimit: 5,
        voiceInputLanguage: "en-US",
      });
    });

    // Validation failures

    it("returns failure when userId is empty", async () => {
      // Act
      const result = await service.updateSettings({
        userId: "",
        voiceInputLanguage: "en-US",
      });

      // Assert
      expect(result).toEqual({ success: false, error: "User ID is required" });
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("returns failure when transactionPatternsLimit is below minimum", async () => {
      // Act
      const result = await service.updateSettings({
        userId: faker.string.uuid(),
        transactionPatternsLimit: MIN_TRANSACTION_PATTERNS_LIMIT - 1,
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
      });
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("returns failure when transactionPatternsLimit is above maximum", async () => {
      // Act
      const result = await service.updateSettings({
        userId: faker.string.uuid(),
        transactionPatternsLimit: MAX_TRANSACTION_PATTERNS_LIMIT + 1,
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
      });
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("returns failure when transactionPatternsLimit is not an integer", async () => {
      // Act
      const result = await service.updateSettings({
        userId: faker.string.uuid(),
        transactionPatternsLimit: 2.5,
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
      });
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });
});
