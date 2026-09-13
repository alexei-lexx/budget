import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toDateTimeString } from "../types/date-time-string";
import {
  fakeChatMessage,
  fakeCreateChatMessageInput,
} from "../utils/test-utils/models/chat-message-fakes";
import { ChatMessage, ChatMessageRole } from "./chat-message";
import { ModelError } from "./model-error";

describe("ChatMessage", () => {
  describe("create", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("builds message with all fields populated", () => {
      // Arrange
      const input = fakeCreateChatMessageInput({
        userId: "user-1",
        sessionId: "session-1",
        role: ChatMessageRole.USER,
        content: "Hello",
        ttlSeconds: 3600,
      });

      // Act
      const result = ChatMessage.create(input, {
        idGenerator: () => "fixed-uuid",
      });

      // Assert
      expect(result.toData()).toEqual({
        id: "fixed-uuid",
        userId: "user-1",
        sessionId: "session-1",
        role: ChatMessageRole.USER,
        content: "Hello",
        createdAt: "2000-01-02T10:11:12.000Z",
        expiresAt:
          Math.floor(new Date("2000-01-02T10:11:12.000Z").getTime() / 1000) +
          3600,
      });
    });

    it("uses default id generator when options omitted", () => {
      // Act
      const result = ChatMessage.create(fakeCreateChatMessageInput());

      // Assert
      expect(result.id).toBeDefined();
    });

    // Validation failures

    it("throws when sessionId is empty", () => {
      // Act & Assert
      expect(() =>
        ChatMessage.create(fakeCreateChatMessageInput({ sessionId: "" })),
      ).toThrow(ModelError);
    });

    it("throws when content is empty", () => {
      // Act & Assert
      expect(() =>
        ChatMessage.create(fakeCreateChatMessageInput({ content: "" })),
      ).toThrow(ModelError);
    });

    it("throws when ttlSeconds is not positive", () => {
      // Act & Assert
      expect(() =>
        ChatMessage.create(fakeCreateChatMessageInput({ ttlSeconds: 0 })),
      ).toThrow(ModelError);
    });
  });

  describe("fromPersistence", () => {
    // Happy path

    it("reconstructs instance from data", () => {
      // Arrange
      const data = fakeChatMessage().toData();

      // Act
      const result = ChatMessage.fromPersistence(data);

      // Assert
      expect(result.toData()).toEqual(data);
    });

    // Validation failures

    it("throws when sessionId is empty", () => {
      // Arrange
      const data = { ...fakeChatMessage().toData(), sessionId: "" };

      // Act & Assert
      expect(() => ChatMessage.fromPersistence(data)).toThrow(ModelError);
    });

    it("throws when content is empty", () => {
      // Arrange
      const data = { ...fakeChatMessage().toData(), content: "" };

      // Act & Assert
      expect(() => ChatMessage.fromPersistence(data)).toThrow(ModelError);
    });

    it("throws when expiresAt is not after createdAt", () => {
      // Arrange
      const createdAt = toDateTimeString("2000-01-02T10:11:12.000Z");
      const data = {
        ...fakeChatMessage().toData(),
        createdAt,
        expiresAt: Math.floor(new Date(createdAt).getTime() / 1000),
      };

      // Act & Assert
      expect(() => ChatMessage.fromPersistence(data)).toThrow(ModelError);
    });
  });

  describe("toData", () => {
    // Happy path

    it("returns plain object with all data fields", () => {
      // Arrange
      const data = fakeChatMessage().toData();
      const message = ChatMessage.fromPersistence(data);

      // Act & Assert
      expect(message.toData()).toEqual(data);
    });
  });
});
