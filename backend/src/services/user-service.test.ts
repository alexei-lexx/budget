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
  const apiBaseUrl = "https://api.example.com";

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    service = new UserService(mockUserRepository, apiBaseUrl);
  });

  describe("getSettings", () => {
    // Happy path

    it("returns settings for existing user", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const user = fakeUser({
        id: userId,
        mcpToken: "token-1",
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
          mcpUrl: "https://api.example.com/mcp?token=token-1",
          transactionPatternsLimit: 5,
          voiceInputLanguage: "pl-PL",
        },
      });
      expect(mockUserRepository.findOneById).toHaveBeenCalledWith(userId);
    });

    it("returns defaults when no settings are saved", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const user = fakeUser({ id: userId, mcpToken: "token-1" });
      // Returns user without saved settings
      mockUserRepository.findOneById.mockResolvedValue(user);

      // Act
      const result = await service.getSettings(userId);

      // Assert
      expect(result).toStrictEqual({
        success: true,
        data: {
          mcpUrl: "https://api.example.com/mcp?token=token-1",
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

  describe("ensureUser", () => {
    // Happy path

    it("returns existing user when email exists", async () => {
      // Arrange
      const user = fakeUser({ email: "user@example.com" });
      mockUserRepository.findOneByEmail.mockResolvedValue(user);

      // Act
      const result = await service.ensureUser("user@example.com");

      // Assert
      expect(result).toBe(user);
      expect(mockUserRepository.findOneByEmail).toHaveBeenCalledWith(
        "user@example.com",
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("creates user when email does not exist", async () => {
      // Arrange
      mockUserRepository.findOneByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await service.ensureUser("new@example.com");

      // Assert
      expect(result.email).toBe("new@example.com");
      expect(mockUserRepository.findOneByEmail).toHaveBeenCalledWith(
        "new@example.com",
      );
      expect(mockUserRepository.create).toHaveBeenCalledWith(result);
    });
  });

  describe("updateSettings", () => {
    // Happy path

    it("updates voiceInputLanguage", async () => {
      // Arrange
      const userId = faker.string.uuid();
      mockUserRepository.findOneById.mockResolvedValue(
        fakeUser({ id: userId, mcpToken: "token-1" }),
      );
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await service.updateSettings({
        userId,
        voiceInputLanguage: "de-DE",
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          mcpUrl: "https://api.example.com/mcp?token=token-1",
          transactionPatternsLimit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          voiceInputLanguage: "de-DE",
        },
      });
      expect(mockUserRepository.findOneById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ voiceInputLanguage: "de-DE" }),
      );
    });

    it("updates transactionPatternsLimit", async () => {
      // Arrange
      const userId = faker.string.uuid();
      mockUserRepository.findOneById.mockResolvedValue(
        fakeUser({ id: userId, mcpToken: "token-1" }),
      );
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await service.updateSettings({
        userId,
        transactionPatternsLimit: 7,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          mcpUrl: "https://api.example.com/mcp?token=token-1",
          transactionPatternsLimit: 7,
          voiceInputLanguage: undefined,
        },
      });
      expect(mockUserRepository.findOneById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ transactionPatternsLimit: 7 }),
      );
    });

    it("updates all fields at once", async () => {
      // Arrange
      const userId = faker.string.uuid();
      mockUserRepository.findOneById.mockResolvedValue(
        fakeUser({ id: userId, mcpToken: "token-1" }),
      );
      mockUserRepository.update.mockResolvedValue(undefined);

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
          mcpUrl: "https://api.example.com/mcp?token=token-1",
          transactionPatternsLimit: 5,
          voiceInputLanguage: "en-US",
        },
      });
      expect(mockUserRepository.findOneById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionPatternsLimit: 5,
          voiceInputLanguage: "en-US",
        }),
      );
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
      expect(mockUserRepository.findOneById).not.toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("returns failure when user is not found", async () => {
      // Arrange
      mockUserRepository.findOneById.mockResolvedValue(null);

      // Act
      const result = await service.updateSettings({
        userId: faker.string.uuid(),
        voiceInputLanguage: "en-US",
      });

      // Assert
      expect(result).toEqual({ success: false, error: "User not found" });
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
      expect(mockUserRepository.findOneById).not.toHaveBeenCalled();
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
      expect(mockUserRepository.findOneById).not.toHaveBeenCalled();
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
      expect(mockUserRepository.findOneById).not.toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("regenerateMcpToken", () => {
    // Happy path

    it("persists new token", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const user = fakeUser({ id: userId, mcpToken: "old-token" });
      mockUserRepository.findOneById.mockResolvedValue(user);
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      await service.regenerateMcpToken(userId);

      // Assert
      expect(mockUserRepository.findOneById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: userId }),
      );

      const updatedUser = mockUserRepository.update.mock.calls[0][0];
      expect(updatedUser.mcpToken).not.toBe("");
      expect(updatedUser.mcpToken).not.toBe("old-token");
    });

    it("returns settings with updated mcpUrl", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const user = fakeUser({ id: userId, mcpToken: "old-token" });
      mockUserRepository.findOneById.mockResolvedValue(user);
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await service.regenerateMcpToken(userId);

      // Assert
      const updatedUser = mockUserRepository.update.mock.calls[0][0];
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          mcpUrl: `https://api.example.com/mcp?token=${updatedUser.mcpToken}`,
        }),
      });
    });

    // Validation failures

    it("returns failure when user is not found", async () => {
      // Arrange
      mockUserRepository.findOneById.mockResolvedValue(null);

      // Act
      const result = await service.regenerateMcpToken(faker.string.uuid());

      // Assert
      expect(result).toEqual({ success: false, error: "User not found" });
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });
});
