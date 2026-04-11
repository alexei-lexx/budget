import { describe, expect, it } from "@jest/globals";
import { AIMessage, BaseMessage, ToolMessage } from "langchain";
import { AgentTraceMessageType } from "../services/ports/agent";
import {
  extractAgentTrace,
  extractLastMessageText,
  extractToolExecutions,
} from "./utils";

describe("extractLastMessageText", () => {
  it("should return undefined when messages array is empty", () => {
    const result = extractLastMessageText([]);

    expect(result).toBeUndefined();
  });

  it("should return string content of last message", () => {
    const messages: BaseMessage[] = [
      new AIMessage({ content: "First" }),
      new AIMessage({ content: "Last" }),
    ];

    const result = extractLastMessageText(messages);

    expect(result).toBe("Last");
  });

  it("should return last text block from array content", () => {
    const messages: BaseMessage[] = [
      new AIMessage({
        content: [
          { type: "text", text: "First block" },
          { type: "text", text: "Last block" },
        ],
      }),
    ];

    const result = extractLastMessageText(messages);

    expect(result).toBe("Last block");
  });

  it("should return empty string when last message has empty string content", () => {
    const messages: BaseMessage[] = [new AIMessage({ content: "" })];

    const result = extractLastMessageText(messages);

    expect(result).toBe("");
  });

  it("should return undefined when array content has no text blocks", () => {
    const messages: BaseMessage[] = [
      new AIMessage({
        content: [
          { type: "image_url", image_url: { url: "http://example.com" } },
        ],
      }),
    ];

    const result = extractLastMessageText(messages);

    expect(result).toBeUndefined();
  });
});

describe("extractToolExecutions", () => {
  it("should return empty array for empty messages", () => {
    expect(extractToolExecutions([])).toEqual([]);
  });

  it("should match tool call with its tool result", () => {
    const aiMessage = new AIMessage({
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
    const toolMessage = new ToolMessage({
      content: "15",
      tool_call_id: "call_1",
      name: "sum",
    });
    const finalMessage = new AIMessage({ content: "The sum is 15." });

    const toolExecutions = extractToolExecutions([
      aiMessage,
      toolMessage,
      finalMessage,
    ]);

    expect(toolExecutions).toHaveLength(1);
    expect(toolExecutions[0]).toEqual({
      tool: "sum",
      input: JSON.stringify({ values: [5, 10] }),
      output: "15",
    });
  });

  it("should return 'Not executed' for tool call without matching result", () => {
    const aiMessage = new AIMessage({
      content: "",
      tool_calls: [
        {
          id: "call_1",
          name: "not_executed_tool",
          args: {},
          type: "tool_call",
        },
      ],
    });

    const toolExecutions = extractToolExecutions([aiMessage]);

    expect(toolExecutions).toHaveLength(1);
    expect(toolExecutions[0]).toEqual({
      tool: "not_executed_tool",
      input: JSON.stringify({}),
      output: "Not executed",
    });
  });

  it("should return 'Unknown arguments' for orphan tool result", () => {
    const toolMessage = new ToolMessage({
      content: "Result",
      tool_call_id: "orphan_id",
      name: "orphan_tool",
    });

    const toolExecutions = extractToolExecutions([toolMessage]);

    expect(toolExecutions).toHaveLength(1);
    expect(toolExecutions[0]).toEqual({
      tool: "orphan_tool",
      input: "Unknown arguments",
      output: "Result",
    });
  });

  it("should match multiple tool calls in one AIMessage to their results", () => {
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

    const toolExecutions = extractToolExecutions([
      aiMessage,
      toolMessage1,
      toolMessage2,
    ]);

    expect(toolExecutions).toHaveLength(2);
    expect(toolExecutions[0]).toEqual({
      tool: "sum",
      input: JSON.stringify({ values: [5, 10] }),
      output: "15",
    });
    expect(toolExecutions[1]).toEqual({
      tool: "avg",
      input: JSON.stringify({ values: [5, 10] }),
      output: "7.5",
    });
  });
});

describe("extractAgentTrace", () => {
  it("should return empty array for empty messages", () => {
    expect(extractAgentTrace([])).toEqual([]);
  });

  it("should build TEXT trace entry from AIMessage string content", () => {
    const messages: BaseMessage[] = [
      new AIMessage({ content: "Thinking about the question..." }),
    ];

    expect(extractAgentTrace(messages)).toEqual([
      {
        type: AgentTraceMessageType.TEXT,
        content: "Thinking about the question...",
      },
    ]);
  });

  it("should build TEXT trace entries from AIMessage array content", () => {
    const messages: BaseMessage[] = [
      new AIMessage({
        content: [
          { type: "text", text: "First thought" },
          { type: "text", text: "Second thought" },
        ],
      }),
    ];

    expect(extractAgentTrace(messages)).toEqual([
      { type: AgentTraceMessageType.TEXT, content: "First thought" },
      { type: AgentTraceMessageType.TEXT, content: "Second thought" },
    ]);
  });

  it("should build TEXT trace entry from reasoning content", () => {
    const messages: BaseMessage[] = [
      new AIMessage({
        content: [
          {
            type: "reasoning_content",
            reasoningText: { text: "Internal reasoning" },
          },
        ],
      }),
    ];

    expect(extractAgentTrace(messages)).toEqual([
      { type: AgentTraceMessageType.TEXT, content: "Internal reasoning" },
    ]);
  });

  it("should build TOOL_CALL trace entry from AIMessage tool_calls", () => {
    const messages: BaseMessage[] = [
      new AIMessage({
        content: "",
        tool_calls: [
          {
            id: "call_1",
            name: "some_tool",
            args: { key: "value" },
            type: "tool_call",
          },
        ],
      }),
    ];

    expect(extractAgentTrace(messages)).toEqual([
      {
        type: AgentTraceMessageType.TOOL_CALL,
        toolName: "some_tool",
        input: JSON.stringify({ key: "value" }, null, 2),
      },
    ]);
  });

  it("should build TOOL_RESULT trace entry from ToolMessage", () => {
    const messages: BaseMessage[] = [
      new ToolMessage({
        content: "Some result",
        tool_call_id: "call_1",
        name: "some_tool",
      }),
    ];

    expect(extractAgentTrace(messages)).toEqual([
      {
        type: AgentTraceMessageType.TOOL_RESULT,
        toolName: "some_tool",
        output: "Some result",
      },
    ]);
  });

  it("should prettify JSON tool output in TOOL_RESULT trace", () => {
    const messages: BaseMessage[] = [
      new ToolMessage({
        content: JSON.stringify([{ id: "1", name: "item" }]),
        tool_call_id: "call_1",
        name: "some_tool",
      }),
    ];

    expect(extractAgentTrace(messages)).toEqual([
      {
        type: AgentTraceMessageType.TOOL_RESULT,
        toolName: "some_tool",
        output: JSON.stringify([{ id: "1", name: "item" }], null, 2),
      },
    ]);
  });

  it("should keep raw string for non-JSON tool output in TOOL_RESULT trace", () => {
    const messages: BaseMessage[] = [
      new ToolMessage({
        content: "not-json",
        tool_call_id: "call_1",
        name: "some_tool",
      }),
    ];

    expect(extractAgentTrace(messages)).toEqual([
      {
        type: AgentTraceMessageType.TOOL_RESULT,
        toolName: "some_tool",
        output: "not-json",
      },
    ]);
  });

  it("should not add TEXT trace entry for empty AIMessage content", () => {
    const messages: BaseMessage[] = [new AIMessage({ content: "" })];

    expect(extractAgentTrace(messages)).toHaveLength(0);
  });

  it("should preserve order: TEXT then TOOL_CALL within the same AIMessage", () => {
    const messages: BaseMessage[] = [
      new AIMessage({
        content: "I will call a tool.",
        tool_calls: [
          {
            id: "call_1",
            name: "sum",
            args: { values: [1, 2] },
            type: "tool_call",
          },
        ],
      }),
    ];

    expect(extractAgentTrace(messages)).toEqual([
      { type: AgentTraceMessageType.TEXT, content: "I will call a tool." },
      {
        type: AgentTraceMessageType.TOOL_CALL,
        toolName: "sum",
        input: JSON.stringify({ values: [1, 2] }, null, 2),
      },
    ]);
  });

  it("should preserve interleaved order across multiple messages", () => {
    const messages: BaseMessage[] = [
      new AIMessage({
        content: "",
        tool_calls: [
          {
            id: "call_1",
            name: "sum",
            args: { values: [5, 10] },
            type: "tool_call",
          },
        ],
      }),
      new ToolMessage({ content: "15", tool_call_id: "call_1", name: "sum" }),
      new AIMessage({
        content: [{ type: "text", text: "I will use a tool now." }],
        tool_calls: [
          {
            id: "call_2",
            name: "avg",
            args: { values: [1, 2] },
            type: "tool_call",
          },
        ],
      }),
      new ToolMessage({ content: "1.5", tool_call_id: "call_2", name: "avg" }),
    ];

    expect(extractAgentTrace(messages)).toEqual([
      {
        type: AgentTraceMessageType.TOOL_CALL,
        toolName: "sum",
        input: JSON.stringify({ values: [5, 10] }, null, 2),
      },
      {
        type: AgentTraceMessageType.TOOL_RESULT,
        toolName: "sum",
        output: "15",
      },
      { type: AgentTraceMessageType.TEXT, content: "I will use a tool now." },
      {
        type: AgentTraceMessageType.TOOL_CALL,
        toolName: "avg",
        input: JSON.stringify({ values: [1, 2] }, null, 2),
      },
      {
        type: AgentTraceMessageType.TOOL_RESULT,
        toolName: "avg",
        output: "1.5",
      },
    ]);
  });
});
