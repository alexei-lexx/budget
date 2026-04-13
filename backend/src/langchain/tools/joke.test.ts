import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage } from "langchain";
import { createJokeAgent } from "../agents/joke-agent";
import { createJokeTool } from "./joke";

jest.mock("../agents/joke-agent", () => ({
  createJokeAgent: jest.fn(),
}));

type AgentInvokeFn = (input: unknown) => Promise<{ messages: AIMessage[] }>;

describe("createJokeTool", () => {
  let mockAgent: { invoke: jest.Mock<AgentInvokeFn> };
  let mockModel: BaseChatModel;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAgent = { invoke: jest.fn<AgentInvokeFn>() };
    mockModel = {} as BaseChatModel;
    (createJokeAgent as jest.Mock).mockReturnValue(mockAgent);
  });

  // Happy path

  it("should return tool with correct name", () => {
    const jokeTool = createJokeTool(mockModel);

    expect(jokeTool.name).toBe("joke");
  });

  it("should call joke agent with generic message when no topic given", async () => {
    // Arrange
    mockAgent.invoke.mockResolvedValue({
      messages: [new AIMessage({ content: "This is a joke." })],
    });
    const jokeTool = createJokeTool(mockModel);

    // Act
    await jokeTool.invoke({});

    // Assert
    const [input] = mockAgent.invoke.mock.calls[0] as [
      { messages: { content: string }[] },
    ];
    expect(input.messages[0].content).toBe("Tell me a joke.");
  });

  it("should call joke agent with topic message when topic is provided", async () => {
    // Arrange
    mockAgent.invoke.mockResolvedValue({
      messages: [new AIMessage({ content: "This is a joke." })],
    });
    const jokeTool = createJokeTool(mockModel);

    // Act
    await jokeTool.invoke({ topic: "cats" });

    // Assert
    const [input] = mockAgent.invoke.mock.calls[0] as [
      { messages: { content: string }[] },
    ];
    expect(input.messages[0].content).toBe("Tell me a joke about cats.");
  });

  it("should return answer from agent response", async () => {
    // Arrange
    mockAgent.invoke.mockResolvedValue({
      messages: [new AIMessage({ content: "This is a joke." })],
    });
    const jokeTool = createJokeTool(mockModel);

    // Act
    const result = await jokeTool.invoke({});

    // Assert
    expect(result).toBe("This is a joke.");
  });

  it("should trim whitespace from answer", async () => {
    // Arrange
    mockAgent.invoke.mockResolvedValue({
      messages: [new AIMessage({ content: "  This is a joke.  " })],
    });
    const jokeTool = createJokeTool(mockModel);

    // Act
    const result = await jokeTool.invoke({});

    // Assert
    expect(result).toBe("This is a joke.");
  });

  // Dependency failures

  it("should propagate error from joke agent", async () => {
    // Arrange
    mockAgent.invoke.mockRejectedValue(new Error("Agent failed"));
    const jokeTool = createJokeTool(mockModel);

    // Act & Assert
    await expect(jokeTool.invoke({})).rejects.toThrow("Agent failed");
  });
});
