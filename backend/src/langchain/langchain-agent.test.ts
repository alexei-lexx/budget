import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import type { Serialized } from "@langchain/core/load/serializable";
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

    it("should forward runName to underlying agent when provided", async () => {
      // Arrange
      const namedAgent = new LangChainAgent(
        mockAgent as unknown as ReactAgent,
        "my-agent",
      );
      mockAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
      });

      // Act
      await namedAgent.invoke(state, config);

      // Assert
      const [, passedConfig] = mockAgent.invoke.mock.calls[0] as [
        unknown,
        { runName?: string },
      ];
      expect(passedConfig.runName).toBe("my-agent");
    });

    it("should not include runName in forwarded config when not provided", async () => {
      // Arrange
      mockAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Answer" })],
      });

      // Act
      await agent.invoke(state, config);

      // Assert
      const [, passedConfig] = mockAgent.invoke.mock.calls[0] as [
        unknown,
        Record<string, unknown>,
      ];
      expect(passedConfig).not.toHaveProperty("runName");
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

    it("should build toolExecutions entry from tool callbacks", async () => {
      // Arrange
      mockAgent.invoke.mockImplementation(async (_state, options) => {
        const { callbacks } = options as { callbacks: CallbackManager };
        const toolMessage = new ToolMessage({
          content: "42",
          tool_call_id: "call-1",
          name: "sum",
        });

        for (const handler of callbacks.handlers) {
          await handler.handleToolStart?.(
            { lc: 1, type: "not_implemented", id: [] } satisfies Serialized,
            '{"a":1}',
            "run-1",
          );
          await handler.handleToolEnd?.(toolMessage, "run-1");
        }

        return { messages: [new AIMessage({ content: "Answer" })] };
      });

      // Act
      const result = await agent.invoke(state, config);

      // Assert
      expect(result.toolExecutions).toEqual([
        { tool: "sum", input: '{"a":1}', output: "42" },
      ]);
    });

    it("should use 'Unknown arguments' in toolExecutions when handleToolStart was not fired", async () => {
      // Arrange
      mockAgent.invoke.mockImplementation(async (_state, options) => {
        const { callbacks } = options as { callbacks: CallbackManager };

        // handleToolEnd fires without a prior handleToolStart for the same runId
        const toolMessage = new ToolMessage({
          content: "42",
          tool_call_id: "call-1",
          name: "sum",
        });

        for (const handler of callbacks.handlers) {
          await handler.handleToolEnd?.(toolMessage, "run-orphan");
        }

        return { messages: [new AIMessage({ content: "Answer" })] };
      });

      // Act
      const result = await agent.invoke(state, config);

      // Assert
      expect(result.toolExecutions).toEqual([
        { tool: "sum", input: "Unknown arguments", output: "42" },
      ]);
    });

    it("should build separate toolExecutions entries for multiple tool calls", async () => {
      // Arrange
      mockAgent.invoke.mockImplementation(async (_state, options) => {
        const { callbacks } = options as { callbacks: CallbackManager };

        const firstToolMessage = new ToolMessage({
          content: "3",
          tool_call_id: "call-1",
          name: "add",
        });
        const secondToolMessage = new ToolMessage({
          content: "6",
          tool_call_id: "call-2",
          name: "multiply",
        });

        for (const handler of callbacks.handlers) {
          await handler.handleToolStart?.(
            { lc: 1, type: "not_implemented", id: [] } satisfies Serialized,
            '{"a":1,"b":2}',
            "run-1",
          );
          await handler.handleToolEnd?.(firstToolMessage, "run-1");
          await handler.handleToolStart?.(
            { lc: 1, type: "not_implemented", id: [] } satisfies Serialized,
            '{"a":2,"b":3}',
            "run-2",
          );
          await handler.handleToolEnd?.(secondToolMessage, "run-2");
        }

        return { messages: [new AIMessage({ content: "Answer" })] };
      });

      // Act
      const result = await agent.invoke(state, config);

      // Assert
      expect(result.toolExecutions).toEqual([
        { tool: "add", input: '{"a":1,"b":2}', output: "3" },
        { tool: "multiply", input: '{"a":2,"b":3}', output: "6" },
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
