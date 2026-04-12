import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AIMessage, ReactAgent, ToolMessage } from "langchain";
import { AgentTraceMessageType } from "../ports/agent-types";
import {
  type AssistantInput,
  AssistantService,
  AssistantServiceImpl,
} from "./assistant-service";

const createMockAssistantAgent = () => ({
  invoke: jest.fn() as jest.MockedFunction<
    (input: unknown, config?: unknown) => Promise<{ messages: unknown[] }>
  >,
});

describe("AssistantService", () => {
  let service: AssistantService;
  let userId: string;
  let mockAssistantAgent: ReturnType<typeof createMockAssistantAgent>;

  beforeEach(() => {
    mockAssistantAgent = createMockAssistantAgent();
    service = new AssistantServiceImpl(
      mockAssistantAgent as unknown as ReactAgent,
    );
    userId = faker.string.uuid();

    jest.clearAllMocks();
  });

  describe("validation", () => {
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
  });

  describe("call", () => {
    const validInput: AssistantInput = {
      question: "Why did my food spending increase?",
    };

    it("should return AI response for valid input", async () => {
      // Arrange
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Your food spending was $50." })],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: {
          answer: "Your food spending was $50.",
        },
      });
    });

    it("should trim answer whitespace", async () => {
      // Arrange
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({ content: "  Your food spending was $50.  " }),
        ],
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
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
      });

      // Act
      await service.call(userId, input);

      // Assert
      const [state] = mockAssistantAgent.invoke.mock.calls[0] as [
        { messages: { content: string }[] },
        unknown,
      ];
      const lastMessage = state.messages[state.messages.length - 1];
      expect(lastMessage.content).toContain(
        "My question: What is my spending?",
      );
    });

    it("should pass userId in context", async () => {
      // Arrange
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
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
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
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

    it("should prepend history messages before the user question", async () => {
      // Arrange
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
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
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
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

    it("should propagate error when assistantAgent fails", async () => {
      // Arrange
      mockAssistantAgent.invoke.mockRejectedValue(
        new Error("AI service unavailable"),
      );

      // Act & Assert
      await expect(service.call(userId, validInput)).rejects.toThrow(
        "AI service unavailable",
      );
    });

    it("should return agentTrace on success", async () => {
      // Arrange
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({ content: "Thinking..." }),
          new AIMessage({ content: "Answer" }),
        ],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: {
          agentTrace: expect.arrayContaining([
            { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
          ]),
        },
      });
    });

    it("should return agentTrace on empty response failure", async () => {
      // Arrange
      const thinkingMessage = new AIMessage({ content: "Thinking..." });
      const emptyFinalMessage = new AIMessage({ content: "" });
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [thinkingMessage, emptyFinalMessage],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: {
          message: "Empty response",
          agentTrace: [
            { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
          ],
        },
      });
    });

    it("should include tool call and result in agentTrace", async () => {
      // Arrange
      const aiMessage = new AIMessage({
        content: "",
        tool_calls: [
          { id: "call_1", name: "getAccounts", args: {}, type: "tool_call" },
        ],
      });
      const toolMessage = new ToolMessage({
        content: "[]",
        tool_call_id: "call_1",
        name: "getAccounts",
      });
      const finalMessage = new AIMessage({ content: "You have no accounts." });
      mockAssistantAgent.invoke.mockResolvedValue({
        messages: [aiMessage, toolMessage, finalMessage],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: {
          agentTrace: expect.arrayContaining([
            expect.objectContaining({
              type: AgentTraceMessageType.TOOL_CALL,
              toolName: "getAccounts",
            }),
            expect.objectContaining({
              type: AgentTraceMessageType.TOOL_RESULT,
              toolName: "getAccounts",
            }),
          ]),
        },
      });
    });
  });
});
