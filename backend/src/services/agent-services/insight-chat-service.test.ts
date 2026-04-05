import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ChatMessageRole } from "../../models/chat-message";
import { fakeChatMessage } from "../../utils/test-utils/models/chat-message-fakes";
import { createMockChatMessageRepository } from "../../utils/test-utils/repositories/chat-message-repository-mocks";
import { ChatMessageRepository } from "../ports/chat-message-repository";
import { InsightChatService } from "./insight-chat-service";
import { InsightService } from "./insight-service";

const createMockInsightService = (): jest.Mocked<InsightService> => ({
  call: jest.fn(),
});

describe("InsightChatService", () => {
  const userId = faker.string.uuid();
  const maxMessages = 20;

  let service: InsightChatService;
  let insightService: jest.Mocked<InsightService>;
  let chatMessageRepository: jest.Mocked<ChatMessageRepository>;

  beforeEach(() => {
    insightService = createMockInsightService();
    chatMessageRepository = createMockChatMessageRepository();

    service = new InsightChatService({
      chatMessageRepository,
      insightService,
      maxMessages,
    });

    jest.clearAllMocks();
  });

  describe("call", () => {
    it("should return success with answer and sessionId", async () => {
      // Arrange
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      insightService.call.mockResolvedValue({
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
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      insightService.call.mockResolvedValue({
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

    it("should load history and pass it to InsightService", async () => {
      // Arrange
      const sessionId = faker.string.uuid();
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
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      insightService.call.mockResolvedValue({
        success: true,
        data: { answer: "Answer", agentTrace: [] },
      });

      // Act
      await service.call(userId, { question: "Follow-up?", sessionId });

      // Assert
      expect(insightService.call).toHaveBeenCalledWith(
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
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      insightService.call.mockResolvedValue({
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

    it("should return failure and not save messages when InsightService fails", async () => {
      // Arrange
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      insightService.call.mockResolvedValue({
        success: false,
        error: { message: "AI failed", agentTrace: [] },
      });

      // Act
      const result = await service.call(userId, { question: "Q?" });

      // Assert
      expect(result).toEqual({
        success: false,
        error: { message: "AI failed", agentTrace: [] },
      });
      expect(chatMessageRepository.create).not.toHaveBeenCalled();
    });

    it("should generate sessionId when not provided", async () => {
      // Arrange
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      insightService.call.mockResolvedValue({
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
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      insightService.call.mockResolvedValue({
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

    it("should handle null sessionId same as undefined", async () => {
      // Arrange
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      chatMessageRepository.create.mockResolvedValue(fakeChatMessage());
      insightService.call.mockResolvedValue({
        success: true,
        data: { answer: "Answer", agentTrace: [] },
      });

      // Act
      const result = await service.call(userId, {
        question: "Q?",
        sessionId: null,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          sessionId: expect.any(String),
        }),
      });
    });
  });
});
