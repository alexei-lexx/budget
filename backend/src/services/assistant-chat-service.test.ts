import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ChatMessageRole } from "../models/chat-message";
import { ChatMessageRepository } from "../ports/chat-message-repository";
import { fakeChatMessage } from "../utils/test-utils/models/chat-message-fakes";
import { createMockChatMessageRepository } from "../utils/test-utils/repositories/chat-message-repository-mocks";
import {
  AssistantChatService,
  AssistantChatServiceImpl,
} from "./assistant-chat-service";
import { AssistantService } from "./assistant-service";

const createMockAssistantService = (): jest.Mocked<AssistantService> => ({
  call: jest.fn(),
});

describe("AssistantChatService", () => {
  const userId = faker.string.uuid();
  const maxMessages = 20;

  let service: AssistantChatService;
  let assistantService: jest.Mocked<AssistantService>;
  let chatMessageRepository: jest.Mocked<ChatMessageRepository>;

  beforeEach(() => {
    assistantService = createMockAssistantService();
    chatMessageRepository = createMockChatMessageRepository();

    service = new AssistantChatServiceImpl({
      chatMessageRepository,
      assistantService,
      maxMessages,
    });

    jest.clearAllMocks();
  });

  describe("call", () => {
    // Happy path

    it("should return success with answer and sessionId", async () => {
      // Arrange
      // No prior messages for this session
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      // Message persistence succeeds
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      // Assistant answers successfully
      assistantService.call.mockResolvedValue({
        success: true,
        data: { answer: "You spent $100", agentTrace: [] },
      });

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

    it("should use provided sessionId if given", async () => {
      // Arrange
      const sessionId = faker.string.uuid();
      // No prior messages for this session
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      // Message persistence succeeds
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      // Assistant answers successfully
      assistantService.call.mockResolvedValue({
        success: true,
        data: { answer: "Answer", agentTrace: [] },
      });

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

    it("should load history and pass it to AssistantService", async () => {
      // Arrange
      const sessionId = faker.string.uuid();
      // Returns prior messages for the session (most recent first)
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([
        fakeChatMessage({
          userId,
          sessionId,
          role: ChatMessageRole.ASSISTANT,
          content: "Prior answer",
        }),
        fakeChatMessage({
          userId,
          sessionId,
          role: ChatMessageRole.USER,
          content: "Prior question",
        }),
      ]);
      // Message persistence succeeds
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      // Assistant answers successfully
      assistantService.call.mockResolvedValue({
        success: true,
        data: { answer: "Answer", agentTrace: [] },
      });

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

    it("should save user message and assistant answer after success", async () => {
      // Arrange
      const sessionId = faker.string.uuid();
      // No prior messages for this session
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      // Message persistence succeeds
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      // Assistant answers successfully
      assistantService.call.mockResolvedValue({
        success: true,
        data: { answer: "You spent $100", agentTrace: [] },
      });

      // Act
      await service.call(userId, { question: "How much?", sessionId });

      // Assert
      expect(chatMessageRepository.create).toHaveBeenCalledTimes(2);
      expect(chatMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          sessionId,
          role: ChatMessageRole.USER,
          content: "How much?",
        }),
      );
      expect(chatMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          sessionId,
          role: ChatMessageRole.ASSISTANT,
          content: "You spent $100",
        }),
      );
    });

    it("should generate sessionId when not provided", async () => {
      // Arrange
      // No prior messages for this session
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      // Message persistence succeeds
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      // Assistant answers successfully
      assistantService.call.mockResolvedValue({
        success: true,
        data: { answer: "Answer", agentTrace: [] },
      });

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

    it("should call repository with maxMessages limit", async () => {
      // Arrange
      const sessionId = faker.string.uuid();
      // No prior messages for this session
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      // Message persistence succeeds
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      // Assistant answers successfully
      assistantService.call.mockResolvedValue({
        success: true,
        data: { answer: "Answer", agentTrace: [] },
      });

      // Act
      await service.call(userId, { question: "Q?", sessionId });

      // Assert
      expect(
        chatMessageRepository.findManyRecentBySessionId,
      ).toHaveBeenCalledWith({ userId, sessionId }, maxMessages);
    });

    // Dependency failures

    it("should return failure and not save messages when AssistantService fails", async () => {
      // Arrange
      // No prior messages for this session
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      // Assistant fails with an error
      assistantService.call.mockResolvedValue({
        success: false,
        error: { message: "AI failed", agentTrace: [] },
      });

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
