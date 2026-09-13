import { faker } from "@faker-js/faker";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fakeCreateTelegramBotInput,
  fakeTelegramBot,
} from "../utils/test-utils/models/telegram-bot-fakes";
import { ModelError } from "./model-error";
import { TelegramBot, TelegramBotStatus } from "./telegram-bot";

describe("TelegramBot", () => {
  describe("create", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("builds bot with all fields populated", () => {
      // Arrange
      const userId = faker.string.uuid();
      const input = fakeCreateTelegramBotInput({ userId, token: "12345" });

      // Act
      const result = TelegramBot.create(input, {
        idGenerator: () => "fixed-uuid",
        webhookSecretGenerator: () => "fixed-secret",
      });

      // Assert
      expect(result.toData()).toEqual({
        id: "fixed-uuid",
        userId,
        token: "12345",
        webhookSecret: "fixed-secret",
        status: TelegramBotStatus.PENDING,
        isArchived: false,
        createdAt: "2000-01-02T10:11:12.000Z",
        updatedAt: "2000-01-02T10:11:12.000Z",
      });
    });

    it("trims token", () => {
      // Act
      const result = TelegramBot.create(
        fakeCreateTelegramBotInput({ token: "  12345  " }),
      );

      // Assert
      expect(result.token).toBe("12345");
    });

    it("uses default id generator when options omitted", () => {
      // Act
      const result = TelegramBot.create(fakeCreateTelegramBotInput());

      // Assert
      expect(result.id).toBeDefined();
    });

    it("uses default webhook secret generator when options omitted", () => {
      // Act
      const result = TelegramBot.create(fakeCreateTelegramBotInput());

      // Assert
      expect(result.webhookSecret).toBeDefined();
    });

    // Validation failures

    it("throws when token is empty", () => {
      // Act & Assert
      expect(() =>
        TelegramBot.create(fakeCreateTelegramBotInput({ token: "  " })),
      ).toThrow(new ModelError("Telegram bot token is required"));
    });
  });

  describe("fromPersistence", () => {
    // Happy path

    it("reconstructs instance from data", () => {
      // Arrange
      const data = fakeTelegramBot().toData();

      // Act
      const result = TelegramBot.fromPersistence(data);

      // Assert
      expect(result.toData()).toEqual(data);
    });

    // Validation failures

    it("throws when token is empty", () => {
      // Arrange
      const data = { ...fakeTelegramBot().toData(), token: "" };

      // Act & Assert
      expect(() => TelegramBot.fromPersistence(data)).toThrow(
        new ModelError("Telegram bot token is required"),
      );
    });

    it("throws when webhook secret is empty", () => {
      // Arrange
      const data = { ...fakeTelegramBot().toData(), webhookSecret: "" };

      // Act & Assert
      expect(() => TelegramBot.fromPersistence(data)).toThrow(
        new ModelError("Telegram bot webhook secret is required"),
      );
    });
  });

  describe("toData", () => {
    // Happy path

    it("returns plain object with all data fields", () => {
      // Arrange
      const data = fakeTelegramBot().toData();
      const bot = TelegramBot.fromPersistence(data);

      // Act & Assert
      expect(bot.toData()).toEqual(data);
    });
  });

  describe("connect", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("sets status to CONNECTED", () => {
      // Arrange
      const existing = fakeTelegramBot({ status: TelegramBotStatus.PENDING });

      // Act
      const result = existing.connect();

      // Assert
      expect(result.status).toBe(TelegramBotStatus.CONNECTED);
    });

    it("sets updatedAt", () => {
      // Arrange
      const existing = fakeTelegramBot({ status: TelegramBotStatus.PENDING });

      // Act
      const result = existing.connect();

      // Assert
      expect(result.updatedAt).toBe("2000-01-02T10:11:12.000Z");
    });

    // Validation failures

    it("throws when bot is not PENDING", () => {
      // Arrange
      const existing = fakeTelegramBot({
        status: TelegramBotStatus.CONNECTED,
      });

      // Act & Assert
      expect(() => existing.connect()).toThrow(
        new ModelError("Cannot connect bot that is not pending"),
      );
    });
  });

  describe("disconnect", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("sets status to DELETING", () => {
      // Arrange
      const existing = fakeTelegramBot({
        status: TelegramBotStatus.CONNECTED,
      });

      // Act
      const result = existing.disconnect();

      // Assert
      expect(result.status).toBe(TelegramBotStatus.DELETING);
    });

    it("sets updatedAt", () => {
      // Arrange
      const existing = fakeTelegramBot({
        status: TelegramBotStatus.CONNECTED,
      });

      // Act
      const result = existing.disconnect();

      // Assert
      expect(result.updatedAt).toBe("2000-01-02T10:11:12.000Z");
    });

    // Validation failures

    it("throws when bot is not CONNECTED", () => {
      // Arrange
      const existing = fakeTelegramBot({ status: TelegramBotStatus.PENDING });

      // Act & Assert
      expect(() => existing.disconnect()).toThrow(
        new ModelError("Cannot disconnect bot that is not connected"),
      );
    });
  });

  describe("archive", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("sets isArchived to true", () => {
      // Arrange
      const existing = fakeTelegramBot({ isArchived: false });

      // Act
      const result = existing.archive();

      // Assert
      expect(result.isArchived).toBe(true);
    });

    it("archives regardless of status", () => {
      // Arrange
      const existing = fakeTelegramBot({
        status: TelegramBotStatus.PENDING,
        isArchived: false,
      });

      // Act
      const result = existing.archive();

      // Assert
      expect(result.isArchived).toBe(true);
      expect(result.status).toBe(TelegramBotStatus.PENDING);
    });

    it("sets updatedAt", () => {
      // Arrange
      const existing = fakeTelegramBot({ isArchived: false });

      // Act
      const result = existing.archive();

      // Assert
      expect(result.updatedAt).toBe("2000-01-02T10:11:12.000Z");
    });

    // Validation failures

    it("throws on already archived bot", () => {
      // Arrange
      const existing = fakeTelegramBot({ isArchived: true });

      // Act & Assert
      expect(() => existing.archive()).toThrow(
        new ModelError("Cannot archive archived telegram bot"),
      );
    });
  });
});
