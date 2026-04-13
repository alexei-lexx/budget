import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import { AIMessage, BaseMessage, ReactAgent, ToolMessage } from "langchain";
import { AgentTraceMessageType } from "../ports/agent-types";
import { LangChainAgent } from "./langchain-agent";

type AgentInvokeFn = (
  input: unknown,
  options?: unknown,
) => Promise<{ messages: BaseMessage[] }>;

describe("LangChainAgent", () => {
  const state = { messages: [{ role: "user" as const, content: "Hello" }] };
  const config = { context: { userId: "user-123" } };

  let mockAgent: { invoke: jest.Mock<AgentInvokeFn> };
  let agent: LangChainAgent<Record<string, unknown>>;

  describe("invoke", () => {
    beforeEach(() => {
      mockAgent = { invoke: jest.fn<AgentInvokeFn>() };
      agent = new LangChainAgent(mockAgent as unknown as ReactAgent);
      jest.clearAllMocks();
    });

    // Happy path

    it("should return answer from last message", async () => {
      // Arrange
      mockAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({ content: "First message" }),
          new AIMessage({ content: "Last message" }),
        ],
      });

      // Act & Assert
      const result = await agent.invoke(state, config);
      expect(result.answer).toBe("Last message");
    });

    it("should trim whitespace from answer", async () => {
      // Arrange
      mockAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "  Answer  " })],
      });

      // Act & Assert
      const result = await agent.invoke(state, config);
      expect(result.answer).toBe("Answer");
    });

    it("should pass messages mapped to role and content to underlying agent", async () => {
      // Arrange
      mockAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
      });

      // Act
      await agent.invoke(state, config);

      // Assert
      const [passedState] = mockAgent.invoke.mock.calls[0] as [
        { messages: { role: string; content: string }[] },
        unknown,
      ];
      expect(passedState.messages).toEqual([
        { role: "user", content: "Hello" },
      ]);
    });

    it("should pass context to underlying agent", async () => {
      // Arrange
      mockAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
      });

      // Act
      await agent.invoke(state, config);

      // Assert
      const [, passedConfig] = mockAgent.invoke.mock.calls[0] as [
        unknown,
        { context: { userId: string } },
      ];
      expect(passedConfig.context.userId).toBe("user-123");
    });

    it("should build agentTrace TEXT entry from LLM callback", async () => {
      // Arrange
      mockAgent.invoke.mockImplementation(async (_state, options) => {
        const { callbacks } = options as { callbacks: CallbackManager };
        const llmResult = {
          generations: [
            [{ text: "", message: new AIMessage({ content: "Thinking..." }) }],
          ],
        };

        for (const handler of callbacks.handlers) {
          await handler.handleLLMEnd?.(llmResult, "run-id");
        }

        return { messages: [new AIMessage({ content: "Answer" })] };
      });

      // Act
      const result = await agent.invoke(state, config);

      // Assert
      expect(result.agentTrace).toEqual([
        { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
      ]);
    });

    it("should build agentTrace TOOL_RESULT entry from tool callback", async () => {
      // Arrange
      mockAgent.invoke.mockImplementation(async (_state, options) => {
        const { callbacks } = options as { callbacks: CallbackManager };
        const toolMessage = new ToolMessage({
          content: "42",
          tool_call_id: "call-1",
          name: "sum",
        });

        for (const handler of callbacks.handlers) {
          await handler.handleToolEnd?.(toolMessage, "run-id");
        }

        return { messages: [new AIMessage({ content: "Answer" })] };
      });

      // Act
      const result = await agent.invoke(state, config);

      // Assert
      expect(result.agentTrace).toEqual([
        {
          type: AgentTraceMessageType.TOOL_RESULT,
          toolName: "sum",
          output: "42",
        },
      ]);
    });

    // Dependency failures

    it("should propagate error from underlying agent", async () => {
      // Arrange
      mockAgent.invoke.mockRejectedValue(new Error("Agent error"));

      // Act & Assert
      await expect(agent.invoke(state, config)).rejects.toThrow("Agent error");
    });
  });
});
