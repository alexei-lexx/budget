import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  Agent,
  AgentTraceMessage,
  AgentTraceMessageType,
} from "../ports/agent-types";
import {
  type AssistantInput,
  AssistantService,
  AssistantServiceImpl,
} from "./assistant-service";

const createMockAssistantAgent = (): jest.Mocked<
  Agent<{
    isVoiceInput: boolean;
    today: string;
    userId: string;
  }>
> => ({
  invoke: jest.fn(),
});

describe("AssistantService", () => {
  let service: AssistantService;
  let userId: string;
  let mockAssistantAgent: jest.Mocked<
    Agent<{
      isVoiceInput: boolean;
      today: string;
      userId: string;
    }>
  >;

  beforeEach(() => {
    mockAssistantAgent = createMockAssistantAgent();
    service = new AssistantServiceImpl(mockAssistantAgent);
    userId = faker.string.uuid();

    jest.clearAllMocks();
  });

  describe("call", () => {
    const validInput: AssistantInput = {
      question: "Why did my food spending increase?",
    };

    // Happy path

    it("should return AI response for valid input", async () => {
      // Arrange

      // Agent returns a valid answer
      mockAssistantAgent.invoke.mockResolvedValue({
        answer: "Your food spending was $50.",
        agentTrace: [],
        toolExecutions: [],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: { answer: "Your food spending was $50." },
      });
    });

    it("should trim answer whitespace", async () => {
      // Arrange

      // Agent returns answer with surrounding whitespace
      mockAssistantAgent.invoke.mockResolvedValue({
        answer: "  Your food spending was $50.  ",
        agentTrace: [],
        toolExecutions: [],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: { answer: "Your food spending was $50." },
      });
    });

    it("should trim question whitespace before sending", async () => {
      // Arrange
      const input: AssistantInput = { question: "  What is my spending?  " };

      // Agent accepts the call and returns an answer
      mockAssistantAgent.invoke.mockResolvedValue({
        answer: "Answer",
        agentTrace: [],
        toolExecutions: [],
      });

      // Act
      await service.call(userId, input);

      // Assert
      const [state] = mockAssistantAgent.invoke.mock.calls[0] as unknown as [
        { messages: { content: string }[] },
        unknown,
      ];
      const lastMessage = state.messages.at(-1);
      expect(lastMessage?.content).toContain(
        "My question: What is my spending?",
      );
    });

    it("should pass userId in context", async () => {
      // Arrange

      // Agent accepts the call and returns an answer
      mockAssistantAgent.invoke.mockResolvedValue({
        answer: "Answer",
        agentTrace: [],
        toolExecutions: [],
      });

      // Act
      await service.call(userId, validInput);

      // Assert
      const [, config] = mockAssistantAgent.invoke.mock.calls[0] as [
        unknown,
        { context: { userId: string } },
      ];
      expect(config.context.userId).toBe(userId);
    });

    it("should pass today's date in context", async () => {
      // Arrange

      // Agent accepts the call and returns an answer
      mockAssistantAgent.invoke.mockResolvedValue({
        answer: "Answer",
        agentTrace: [],
        toolExecutions: [],
      });

      // Act
      await service.call(userId, validInput);

      // Assert
      const [, config] = mockAssistantAgent.invoke.mock.calls[0] as [
        unknown,
        { context: { today: string } },
      ];
      expect(config.context.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should pass isVoiceInput: false in context when not provided", async () => {
      // Arrange
      mockAssistantAgent.invoke.mockResolvedValue({
        answer: "Answer",
        agentTrace: [],
        toolExecutions: [],
      });

      // Act
      await service.call(userId, validInput);

      // Assert
      const [, config] = mockAssistantAgent.invoke.mock.calls[0] as [
        unknown,
        { context: { isVoiceInput: boolean } },
      ];
      expect(config.context.isVoiceInput).toBe(false);
    });

    it("should pass isVoiceInput: true in context when provided", async () => {
      // Arrange
      mockAssistantAgent.invoke.mockResolvedValue({
        answer: "Answer",
        agentTrace: [],
        toolExecutions: [],
      });

      // Act
      await service.call(userId, { ...validInput, isVoiceInput: true });

      // Assert
      const [, config] = mockAssistantAgent.invoke.mock.calls[0] as [
        unknown,
        { context: { isVoiceInput: boolean } },
      ];
      expect(config.context.isVoiceInput).toBe(true);
    });

    it("should prepend history messages before the user question", async () => {
      // Arrange

      // Agent accepts the call and returns an answer
      mockAssistantAgent.invoke.mockResolvedValue({
        answer: "Answer",
        agentTrace: [],
        toolExecutions: [],
      });
      const history = [
        { role: "user" as const, content: "Previous question" },
        { role: "assistant" as const, content: "Previous answer" },
      ];

      // Act
      await service.call(userId, { ...validInput, history });

      // Assert
      const [state] = mockAssistantAgent.invoke.mock.calls[0] as [
        { messages: { role: string; content: string }[] },
        unknown,
      ];
      expect(state.messages).toHaveLength(3);
      expect(state.messages[0]).toEqual(history[0]);
      expect(state.messages[1]).toEqual(history[1]);
      expect(state.messages[2].content).toContain(validInput.question);
    });

    it("should work without history (history defaults to empty)", async () => {
      // Arrange

      // Agent accepts the call and returns an answer
      mockAssistantAgent.invoke.mockResolvedValue({
        answer: "Answer",
        agentTrace: [],
        toolExecutions: [],
      });

      // Act
      await service.call(userId, validInput);

      // Assert
      const [state] = mockAssistantAgent.invoke.mock.calls[0] as [
        { messages: unknown[] },
        unknown,
      ];
      expect(state.messages).toHaveLength(1);
    });

    it("should return agentTrace on success", async () => {
      // Arrange
      const agentTrace: AgentTraceMessage[] = [
        { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
      ];

      // Agent returns a valid answer with a thinking trace
      mockAssistantAgent.invoke.mockResolvedValue({
        answer: "Answer",
        agentTrace,
        toolExecutions: [],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: { agentTrace },
      });
    });

    // Validation failures

    it("should return failure when userId is empty", async () => {
      // Act
      const result = await service.call("", { question: "Valid question?" });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "User ID is required" },
      });
      expect(mockAssistantAgent.invoke).not.toHaveBeenCalled();
    });

    it("should return failure when question is empty", async () => {
      // Arrange
      const input: AssistantInput = { question: "" };

      // Act
      const result = await service.call(userId, input);

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Question is required" },
      });
      expect(mockAssistantAgent.invoke).not.toHaveBeenCalled();
    });

    it("should return failure when question is only whitespace", async () => {
      // Arrange
      const input: AssistantInput = { question: "   " };

      // Act
      const result = await service.call(userId, input);

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Question is required" },
      });
      expect(mockAssistantAgent.invoke).not.toHaveBeenCalled();
    });

    // Dependency failures

    it("should propagate error when agent fails", async () => {
      // Arrange

      // Agent throws unexpectedly
      mockAssistantAgent.invoke.mockRejectedValue(
        new Error("AI service unavailable"),
      );

      // Act & Assert
      await expect(service.call(userId, validInput)).rejects.toThrow(
        "AI service unavailable",
      );
    });

    it("should return failure when answer is empty", async () => {
      // Arrange

      // Agent returns an empty answer
      mockAssistantAgent.invoke.mockResolvedValue({
        answer: "",
        agentTrace: [],
        toolExecutions: [],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Empty response" },
      });
    });

    it("should return failure when answer is undefined", async () => {
      // Arrange

      // Agent returns no answer
      mockAssistantAgent.invoke.mockResolvedValue({
        answer: undefined,
        agentTrace: [],
        toolExecutions: [],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Empty response" },
      });
    });

    it("should return agentTrace on empty response failure", async () => {
      // Arrange
      const agentTrace: AgentTraceMessage[] = [
        { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
      ];

      // Agent returns no answer but includes a thinking trace
      mockAssistantAgent.invoke.mockResolvedValue({
        answer: undefined,
        agentTrace,
        toolExecutions: [],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Empty response", agentTrace },
      });
    });
  });
});
