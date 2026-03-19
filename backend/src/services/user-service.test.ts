import { faker } from "@faker-js/faker";
import { fakeUser } from "../utils/test-utils/factories";
import { createMockUserRepository } from "../utils/test-utils/mock-repositories";
import { UserRepository } from "./ports/user-repository";
import {
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
        voiceInputLanguage: "pl-PL",
        transactionPatternsLimit: 5,
      });
      mockUserRepository.findById.mockResolvedValue(user);

      // Act
      const result = await service.getSettings(userId);

      // Assert
      expect(result).toEqual({
        success: true,
        data: { voiceInputLanguage: "pl-PL", transactionPatternsLimit: 5 },
      });
    });

    it("should return empty data when no settings are saved", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const user = fakeUser({ id: userId });
      mockUserRepository.findById.mockResolvedValue(user);

      // Act
      const result = await service.getSettings(userId);

      // Assert
      expect(result).toEqual({ success: true, data: {} });
    });

    it("should fail when user is not found", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

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
        data: { voiceInputLanguage: "de-DE" },
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
        data: { transactionPatternsLimit: 7 },
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
        voiceInputLanguage: "en-US",
        transactionPatternsLimit: 5,
      });
      mockUserRepository.update.mockResolvedValue(updated);

      // Act
      const result = await service.updateSettings({
        userId,
        voiceInputLanguage: "en-US",
        transactionPatternsLimit: 5,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: { voiceInputLanguage: "en-US", transactionPatternsLimit: 5 },
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
