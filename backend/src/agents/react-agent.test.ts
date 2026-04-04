import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  AIMessage,
  StructuredTool,
  ToolMessage,
  createAgent,
  tool,
} from "langchain";
import { z } from "zod";
import { AgentTraceMessageType, ToolSignature } from "../services/ports/agent";
import { Success } from "../types/result";
import { ReActAgent } from "./react-agent";

// Mock LangChain's createAgent and tool
jest.mock("langchain", () => {
  const actual = jest.requireActual<typeof import("langchain")>("langchain");

  return {
    ...actual,
    createAgent: jest.fn(),
    tool: jest.fn(),
  };
});

describe("ReActAgent", () => {
  let agent: ReActAgent;
  let mockModel: BaseChatModel;
  let mockInvoke: jest.MockedFunction<
    (input: unknown) => Promise<{ messages: unknown[] }>
  >;

  beforeEach(() => {
    // Create mock model
    mockModel = {} as BaseChatModel;

    mockInvoke = jest.fn();

    (createAgent as jest.Mock).mockReturnValue({
      invoke: mockInvoke,
    });

    agent = new ReActAgent(mockModel);

    jest.clearAllMocks();
  });

  describe("call", () => {
    it("should create agent with correct configuration", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Test question" }];
      const systemPrompt = "You are a test assistant";
      const testTool: ToolSignature<{ text: string }, string> = {
        name: "test_tool",
        description: "A test tool",
        func: async (input: { text: string }) => Success(`Echo: ${input.text}`),
        inputSchema: z.object({ text: z.string() }),
      };
      mockInvoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "Test answer",
            tool_calls: [],
          }),
        ],
      });

      // Mock the tool() function to return LangChain tools
      const mockLangchainTool = {
        name: "test_tool",
        description: "A test tool",
      } as StructuredTool;

      (tool as jest.Mock).mockReturnValue(mockLangchainTool);

      // Act
      await agent.call({ messages, systemPrompt, tools: [testTool] });

      // Assert
      expect(tool).toHaveBeenCalledWith(testTool.func, {
        name: testTool.name,
        description: testTool.description,
        schema: testTool.inputSchema,
      });
      expect(createAgent).toHaveBeenCalledWith({
        model: mockModel,
        tools: [mockLangchainTool],
        systemPrompt,
      });
    });

    it("should invoke agent with mapped messages", async () => {
      // Arrange
      const messages = [
        { role: "user" as const, content: "Question 1" },
        { role: "assistant" as const, content: "Answer 1" },
        { role: "user" as const, content: "Question 2" },
      ];

      mockInvoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "Final answer",
          }),
        ],
      });

      // Act
      await agent.call({ messages });

      // Assert
      expect(mockInvoke).toHaveBeenCalledWith({
        messages: [
          { role: "user", content: "Question 1" },
          { role: "assistant", content: "Answer 1" },
          { role: "user", content: "Question 2" },
        ],
      });
    });

    it("should return answer from last message", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Test" }];

      mockInvoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "This is not the final answer",
            tool_calls: [],
          }),
          new AIMessage({
            content: "This is the final answer",
            tool_calls: [],
          }),
        ],
      });

      // Act
      const result = await agent.call({ messages });

      // Assert
      expect(result.answer).toBe("This is the final answer");
    });

    it("should return answer from last text block of last message", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Test" }];

      mockInvoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "This is not the final answer",
          }),
          new AIMessage({
            content: [
              { type: "text", text: "This is not the final answer" },
              { type: "text", text: "This is the final answer" },
            ],
          }),
        ],
      });

      // Act
      const result = await agent.call({ messages });

      // Assert
      expect(result.answer).toBe("This is the final answer");
    });

    it("should extract tool executions from agent messages", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Calculate sum" }];

      const aiMessage = new AIMessage({
        content: "",
        tool_calls: [
          {
            id: "call_1",
            name: "sum",
            args: { values: [5, 10] },
            type: "tool_call",
          },
          {
            id: "call_2",
            name: "avg",
            args: { values: [5, 10] },
            type: "tool_call",
          },
        ],
      });

      const toolMessage1 = new ToolMessage({
        content: "15",
        tool_call_id: "call_1",
        name: "sum",
      });

      const toolMessage2 = new ToolMessage({
        content: "7.5",
        tool_call_id: "call_2",
        name: "avg",
      });

      const finalMessage = new AIMessage({
        content: "Sum is 15, average is 7.5",
        tool_calls: [],
      });

      mockInvoke.mockResolvedValue({
        messages: [aiMessage, toolMessage1, toolMessage2, finalMessage],
      });

      // Act
      const result = await agent.call({ messages });

      // Assert
      expect(result.answer).toBe("Sum is 15, average is 7.5");
      expect(result.toolExecutions).toHaveLength(2);
      expect(result.toolExecutions[0]).toEqual({
        tool: "sum",
        input: JSON.stringify({ values: [5, 10] }),
        output: "15",
      });
      expect(result.toolExecutions[1]).toEqual({
        tool: "avg",
        input: JSON.stringify({ values: [5, 10] }),
        output: "7.5",
      });
    });

    it("should handle tool message without matching call", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Test" }];

      const toolMessage = new ToolMessage({
        content: "Result",
        tool_call_id: "orphan-call-id",
        name: "orphan_tool",
      });

      const finalMessage = new AIMessage({
        content: "Done",
        tool_calls: [],
      });

      mockInvoke.mockResolvedValue({
        messages: [toolMessage, finalMessage],
      });

      // Act
      const result = await agent.call({ messages });

      // Assert
      expect(result.toolExecutions).toHaveLength(1);
      expect(result.toolExecutions[0]).toEqual({
        tool: "orphan_tool",
        input: "Unknown arguments",
        output: "Result",
      });
    });

    it("should handle missing tool call id", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Test" }];

      const aiMessage = new AIMessage({
        content: "",
        tool_calls: [
          {
            id: undefined,
            name: "test_tool",
            args: { input: "test" },
            type: "tool_call",
          },
        ],
      });

      const finalMessage = new AIMessage({
        content: "Done",
        tool_calls: [],
      });

      mockInvoke.mockResolvedValue({
        messages: [aiMessage, finalMessage],
      });

      // Act
      const result = await agent.call({ messages });

      // Assert
      expect(result.toolExecutions).toHaveLength(1);
      expect(result.toolExecutions[0].tool).toBe("test_tool");
      expect(result.toolExecutions[0].output).toBe("Not executed");
    });

    it("should handle empty response content", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Test" }];

      mockInvoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "",
            tool_calls: [],
          }),
        ],
      });

      // Act
      const result = await agent.call({ messages });

      // Assert
      expect(result.answer).toBe("");
    });

    it("should return agentTrace with text", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Calculate sum" }];

      const aiMessage1 = new AIMessage({
        content: "First message",
      });

      const aiMessage2 = new AIMessage({
        content: [
          {
            text: "Second message",
            type: "text",
          },
          {
            text: "Third message",
            type: "text",
          },
        ],
      });

      mockInvoke.mockResolvedValue({
        messages: [aiMessage1, aiMessage2],
      });

      // Act
      const result = await agent.call({ messages });

      // Assert
      expect(result.agentTrace).toHaveLength(3);

      expect(result.agentTrace[0]).toEqual({
        type: AgentTraceMessageType.TEXT,
        content: "First message",
      });

      expect(result.agentTrace[1]).toEqual({
        type: AgentTraceMessageType.TEXT,
        content: "Second message",
      });

      expect(result.agentTrace[2]).toEqual({
        type: AgentTraceMessageType.TEXT,
        content: "Third message",
      });
    });

    it("should return agentTrace with reasoning", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Calculate sum" }];

      const aiMessage = new AIMessage({
        content: [
          {
            type: "reasoning_content",
            reasoningText: { text: "First message" },
          },
          { type: "text", text: "Second message" },
        ],
      });

      mockInvoke.mockResolvedValue({
        messages: [aiMessage],
      });

      // Act
      const result = await agent.call({ messages });

      // Assert
      expect(result.agentTrace).toHaveLength(2);

      expect(result.agentTrace[0]).toEqual({
        type: AgentTraceMessageType.TEXT,
        content: "First message",
      });

      expect(result.agentTrace[1]).toEqual({
        type: AgentTraceMessageType.TEXT,
        content: "Second message",
      });
    });

    it("should return agentTrace with tools", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Calculate sum" }];

      const aiMessage1 = new AIMessage({
        content: "",
        tool_calls: [
          {
            id: "call_1",
            name: "sum",
            args: { values: [5, 10] },
            type: "tool_call",
          },
        ],
      });

      const toolResultMessage1 = new ToolMessage({
        content: "15",
        name: "sum",
        tool_call_id: "call_1",
      });

      const aiMessage2 = new AIMessage({
        content: [{ type: "text", text: "I will use a tool now." }],
        tool_calls: [
          {
            id: "call_2",
            name: "avg",
            args: { values: [1, 2] },
            type: "tool_call",
          },
        ],
      });

      const toolResultMessage2 = new ToolMessage({
        content: "1.5",
        name: "avg",
        tool_call_id: "call_2",
      });

      mockInvoke.mockResolvedValue({
        messages: [
          aiMessage1,
          toolResultMessage1,
          aiMessage2,
          toolResultMessage2,
        ],
      });

      // Act
      const result = await agent.call({ messages });

      // Assert
      expect(result.agentTrace).toHaveLength(5);

      expect(result.agentTrace[0]).toEqual({
        type: AgentTraceMessageType.TOOL_CALL,
        toolName: "sum",
        input: JSON.stringify({ values: [5, 10] }, null, 2),
      });

      expect(result.agentTrace[1]).toEqual({
        type: AgentTraceMessageType.TOOL_RESULT,
        toolName: "sum",
        output: "15",
      });

      expect(result.agentTrace[2]).toEqual({
        type: AgentTraceMessageType.TEXT,
        content: "I will use a tool now.",
      });

      expect(result.agentTrace[3]).toEqual({
        type: AgentTraceMessageType.TOOL_CALL,
        toolName: "avg",
        input: JSON.stringify({ values: [1, 2] }, null, 2),
      });

      expect(result.agentTrace[4]).toEqual({
        type: AgentTraceMessageType.TOOL_RESULT,
        toolName: "avg",
        output: "1.5",
      });
    });

    it("should return empty agentTrace for messages with no content", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Test" }];

      const aiMessage1 = new AIMessage({ content: "" });

      const aiMessage2 = new AIMessage({
        content: [
          {
            content: "",
            type: "text",
          },
          {
            content: "",
            type: "reasoning_content",
          },
        ],
      });

      mockInvoke.mockResolvedValue({
        messages: [aiMessage1, aiMessage2],
      });

      // Act
      const result = await agent.call({ messages });

      // Assert
      expect(result.agentTrace).toHaveLength(0);
    });
  });
});
