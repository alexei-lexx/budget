import { ChatBedrockConverse } from "@langchain/aws";
import { AIMessage, StructuredTool, ToolMessage, createAgent } from "langchain";
import { LangchainBedrockAgent } from "./langchain-bedrock-agent";

// Mock LangChain's createAgent
jest.mock("langchain", () => ({
  ...jest.requireActual("langchain"),
  createAgent: jest.fn(),
}));

describe("LangchainBedrockAgent", () => {
  let agent: LangchainBedrockAgent;
  let mockModel: jest.Mocked<ChatBedrockConverse>;
  let mockTools: StructuredTool[];
  let mockReactAgent: { invoke: jest.Mock };

  beforeEach(() => {
    // Create mock model
    mockModel = {} as jest.Mocked<ChatBedrockConverse>;

    // Create mock tools
    mockTools = [
      {
        name: "sum",
        description: "Add numbers",
      } as StructuredTool,
    ];

    // Create mock ReAct agent
    mockReactAgent = {
      invoke: jest.fn(),
    };

    (createAgent as jest.Mock).mockReturnValue(mockReactAgent);

    agent = new LangchainBedrockAgent(mockTools, mockModel);

    jest.clearAllMocks();
  });

  describe("call", () => {
    it("should create agent with correct configuration", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Test question" }];
      const systemPrompt = "You are a test assistant";

      mockReactAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "Test answer",
            tool_calls: [],
          }),
        ],
      });

      // Act
      await agent.call(messages, systemPrompt);

      // Assert
      expect(createAgent).toHaveBeenCalledWith({
        model: mockModel,
        tools: mockTools,
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

      mockReactAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "Final answer",
          }),
        ],
      });

      // Act
      await agent.call(messages);

      // Assert
      expect(mockReactAgent.invoke).toHaveBeenCalledWith({
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

      mockReactAgent.invoke.mockResolvedValue({
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
      const result = await agent.call(messages);

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

      mockReactAgent.invoke.mockResolvedValue({
        messages: [aiMessage, toolMessage1, toolMessage2, finalMessage],
      });

      // Act
      const result = await agent.call(messages);

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

      mockReactAgent.invoke.mockResolvedValue({
        messages: [toolMessage, finalMessage],
      });

      // Act
      const result = await agent.call(messages);

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

      mockReactAgent.invoke.mockResolvedValue({
        messages: [aiMessage, finalMessage],
      });

      // Act
      const result = await agent.call(messages);

      // Assert
      expect(result.toolExecutions).toHaveLength(1);
      expect(result.toolExecutions[0].tool).toBe("test_tool");
      expect(result.toolExecutions[0].output).toBe("Not executed");
    });

    it("should handle empty response content", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Test" }];

      mockReactAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "",
            tool_calls: [],
          }),
        ],
      });

      // Act
      const result = await agent.call(messages);

      // Assert
      expect(result.answer).toBe("");
    });

    it("should work without system prompt", async () => {
      // Arrange
      const messages = [{ role: "user" as const, content: "Test" }];

      mockReactAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "Answer",
            tool_calls: [],
          }),
        ],
      });

      // Act
      await agent.call(messages);

      // Assert
      expect(createAgent).toHaveBeenCalledWith({
        model: mockModel,
        tools: mockTools,
        systemPrompt: undefined,
      });
    });
  });
});
