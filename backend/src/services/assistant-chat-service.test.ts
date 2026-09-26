import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMessageRepository } from "../ports/chat-message-repository";
import { Failure, Success } from "../types/result";
import { fakeChatMessage } from "../utils/test-utils/models/chat-message-fakes";
import { createMockChatMessageRepository } from "../utils/test-utils/repositories/chat-message-repository-mocks";
import { createMockAssistantService } from "../utils/test-utils/services/assistant-service-mocks";
import {
  AssistantChatService,
  AssistantChatServiceImpl,
} from "./assistant-chat-service";
import { AssistantService } from "./assistant-service";

describe("AssistantChatService", () => {
  const userId = faker.string.uuid();
  const maxMessages = 20;
  const ttlSeconds = 3600;

  let service: AssistantChatService;
  let assistantService: Mocked<AssistantService>;
  let chatMessageRepository: Mocked<ChatMessageRepository>;

  beforeEach(() => {
    assistantService = createMockAssistantService();
    chatMessageRepository = createMockChatMessageRepository();

    service = new AssistantChatServiceImpl({
      chatMessageRepository,
      assistantService,
      maxMessages,
      ttlSeconds,
    });

    vi.clearAllMocks();
  });

  describe("call", () => {
    // Happy path

    it("returns success with answer and sessionId", async () => {
      // Arrange
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(undefined);
      assistantService.call.mockResolvedValue(
        Success({ answer: "You spent $100", agentTrace: [] }),
      );

      // Act
      const result = await service.call(userId, {
        question: "How much did I spend?",
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          agentTrace: [],
          answer: "You spent $100",
          sessionId: expect.any(String),
        },
      });
    });

    it("uses provided sessionId if given", async () => {
      // Arrange
      const sessionId = faker.string.uuid();
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(undefined);
      assistantService.call.mockResolvedValue(
        Success({ answer: "Answer", agentTrace: [] }),
      );

      // Act
      const result = await service.call(userId, {
        question: "Q?",
        sessionId,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({ sessionId }),
      });
      expect(
        chatMessageRepository.findManyRecentBySessionId,
      ).toHaveBeenCalledWith({ userId, sessionId }, maxMessages);
    });

    it("loads history and passes it to AssistantService", async () => {
      // Arrange
      const sessionId = faker.string.uuid();
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([
        fakeChatMessage({
          userId,
          sessionId,
          role: "ASSISTANT",
          content: "Prior answer",
        }),
        fakeChatMessage({
          userId,
          sessionId,
          role: "USER",
          content: "Prior question",
        }),
      ]);
      chatMessageRepository.create.mockResolvedValue(undefined);
      assistantService.call.mockResolvedValue(
        Success({ answer: "Answer", agentTrace: [] }),
      );

      // Act
      await service.call(userId, { question: "Follow-up?", sessionId });

      // Assert
      expect(assistantService.call).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          question: "Follow-up?",
          history: [
            { role: "user", content: "Prior question" },
            { role: "assistant", content: "Prior answer" },
          ],
        }),
      );
    });

    it("saves user message and assistant answer after success", async () => {
      // Arrange
      const sessionId = faker.string.uuid();
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(undefined);
      assistantService.call.mockResolvedValue(
        Success({ answer: "You spent $100", agentTrace: [] }),
      );

      // Act
      await service.call(userId, { question: "How much?", sessionId });

      // Assert
      expect(chatMessageRepository.create).toHaveBeenCalledTimes(2);
      expect(chatMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          sessionId,
          role: "USER",
          content: "How much?",
        }),
      );
      expect(chatMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          sessionId,
          role: "ASSISTANT",
          content: "You spent $100",
        }),
      );
    });

    it("generates sessionId when not provided", async () => {
      // Arrange
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(undefined);
      assistantService.call.mockResolvedValue(
        Success({ answer: "Answer", agentTrace: [] }),
      );

      // Act
      const result = await service.call(userId, { question: "Q?" });

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          sessionId: expect.any(String),
        }),
      });
    });

    it("forwards isVoiceInput to AssistantService when provided", async () => {
      // Arrange
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(undefined);
      assistantService.call.mockResolvedValue(
        Success({ answer: "Answer", agentTrace: [] }),
      );

      // Act
      await service.call(userId, {
        question: "coffee 5€",
        isVoiceInput: true,
      });

      // Assert
      expect(assistantService.call).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ isVoiceInput: true }),
      );
    });

    it("forwards isVoiceInput: undefined to AssistantService when not provided", async () => {
      // Arrange
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(undefined);
      assistantService.call.mockResolvedValue(
        Success({ answer: "Answer", agentTrace: [] }),
      );

      // Act
      await service.call(userId, { question: "How much did I spend?" });

      // Assert
      expect(assistantService.call).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ isVoiceInput: undefined }),
      );
    });

    it("calls repository with maxMessages limit", async () => {
      // Arrange
      const sessionId = faker.string.uuid();
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(undefined);
      assistantService.call.mockResolvedValue(
        Success({ answer: "Answer", agentTrace: [] }),
      );

      // Act
      await service.call(userId, { question: "Q?", sessionId });

      // Assert
      expect(
        chatMessageRepository.findManyRecentBySessionId,
      ).toHaveBeenCalledWith({ userId, sessionId }, maxMessages);
    });

    // Validation failures

    it("fails when model invariant is violated", async () => {
      // Arrange
      const sessionId = faker.string.uuid();
      // Empty question triggers ModelError, which the service must expose as failure
      const input = { question: "", sessionId };

      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      assistantService.call.mockResolvedValue(
        Success({ answer: "Answer", agentTrace: [] }),
      );

      // Act
      const result = await service.call(userId, input);

      // Assert
      expect(result).toBeFailure({
        message: "Chat message content is required",
        agentTrace: [],
        sessionId,
      });
      expect(chatMessageRepository.create).not.toHaveBeenCalled();
    });

    // Dependency failures

    it("returns failure and does not save messages when AssistantService fails", async () => {
      // Arrange
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      assistantService.call.mockResolvedValue(
        Failure({ message: "AI failed", agentTrace: [] }),
      );

      // Act
      const result = await service.call(userId, { question: "Q?" });

      // Assert
      expect(result).toEqual({
        success: false,
        error: {
          message: "AI failed",
          agentTrace: [],
          sessionId: expect.any(String),
        },
      });
      expect(chatMessageRepository.create).not.toHaveBeenCalled();
    });
  });
});
