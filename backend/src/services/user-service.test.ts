import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fakeUser } from "../utils/test-utils/models/user-fakes";
import { createMockUserRepository } from "../utils/test-utils/repositories/user-repository-mocks";
import { UserRepository } from "./ports/user-repository";
import {
  DEFAULT_TRANSACTION_PATTERNS_LIMIT,
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_TRANSACTION_PATTERNS_LIMIT,
} from "./transaction-service";
import { UserService } from "./user-service";

describe("UserService", () => {
  let service: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    service = new UserService(mockUserRepository);
  });

  describe("getSettings", () => {
    it("should return settings for an existing user", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const user = fakeUser({
        id: userId,
        transactionPatternsLimit: 5,
        voiceInputLanguage: "pl-PL",
      });
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
    });

    it("should return defaults when no settings are saved", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const user = fakeUser({ id: userId });
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
    });

    it("should fail when user is not found", async () => {
      // Arrange
      mockUserRepository.findOneById.mockResolvedValue(null);

      // Act
      const result = await service.getSettings(faker.string.uuid());

      // Assert
      expect(result).toEqual({ success: false, error: "User not found" });
    });

    it("should fail when userId is empty", async () => {
      const result = await service.getSettings("");

      expect(result).toEqual({ success: false, error: "User ID is required" });
    });
  });

  describe("updateSettings", () => {
    it("should update voiceInputLanguage", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const updated = fakeUser({ id: userId, voiceInputLanguage: "de-DE" });
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

    it("should update transactionPatternsLimit", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const updated = fakeUser({ id: userId, transactionPatternsLimit: 7 });
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
    });

    it("should fail when transactionPatternsLimit is below minimum", async () => {
      const result = await service.updateSettings({
        userId: faker.string.uuid(),
        transactionPatternsLimit: MIN_TRANSACTION_PATTERNS_LIMIT - 1,
      });

      expect(result).toEqual({
        success: false,
        error: `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
      });
    });

    it("should fail when transactionPatternsLimit is above maximum", async () => {
      const result = await service.updateSettings({
        userId: faker.string.uuid(),
        transactionPatternsLimit: MAX_TRANSACTION_PATTERNS_LIMIT + 1,
      });

      expect(result).toEqual({
        success: false,
        error: `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
      });
    });

    it("should fail when transactionPatternsLimit is not an integer", async () => {
      const result = await service.updateSettings({
        userId: faker.string.uuid(),
        transactionPatternsLimit: 2.5,
      });

      expect(result).toEqual({
        success: false,
        error: `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
      });
    });

    it("should update both fields at once", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const updated = fakeUser({
        id: userId,
        transactionPatternsLimit: 5,
        voiceInputLanguage: "en-US",
      });
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
    });

    it("should fail when userId is empty", async () => {
      const result = await service.updateSettings({
        userId: "",
        voiceInputLanguage: "en-US",
      });

      expect(result).toEqual({ success: false, error: "User ID is required" });
    });
  });
});
