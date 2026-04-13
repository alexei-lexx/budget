import { randomUUID } from "crypto";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import { AIMessage, BaseMessage, ReactAgent, ToolMessage } from "langchain";
import {
  Agent,
  AgentMessage,
  AgentTraceMessage,
  AgentTraceMessageType,
  ToolExecution,
} from "../ports/agent-types";

export class AgentLike<TContext extends Record<string, unknown>>
  implements Agent<TContext>
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private agent: ReactAgent<any>) {}

  async invoke(
    state: { messages: readonly AgentMessage[] },
    config: { context: TContext },
  ) {
    const agentTrace: AgentTraceMessage[] = [];
    const pendingToolInputs = new Map<string, string>();
    const toolExecutions: ToolExecution[] = [];
    const callbackManager = new CallbackManager();

    callbackManager.addHandler(
      BaseCallbackHandler.fromMethods({
        handleLLMEnd(llmResult) {
          for (const promptGenerations of llmResult.generations) {
            for (const generation of promptGenerations) {
              if (!("message" in generation)) {
                // Skip if the generation does not contain a message
                continue;
              }

              const message = generation.message;

              if (!(message instanceof AIMessage)) {
                // Skip to narrow down to AIMessage instances
                continue;
              }

              const agentTraceMessages = extractAgentTraceTexts(message);
              agentTrace.push(...agentTraceMessages);
            }
          }
        },
        handleToolStart(_tool, input, runId) {
          pendingToolInputs.set(runId, input);
        },
        handleToolEnd(output, runId) {
          const agentTraceMessage = extractAgentTraceToolResult(output);
          agentTrace.push(agentTraceMessage);

          toolExecutions.push({
            tool: output.name || "Unknown tool",
            input: pendingToolInputs.get(runId) ?? "Unknown arguments",
            output: output.content ? String(output.content) : "Unknown result",
          });
          pendingToolInputs.delete(runId);
        },
      }),
    );

    const messages = state.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const response = await this.agent.invoke(
      { ...state, messages },
      { ...config, callbacks: callbackManager },
    );

    const answer = extractLastMessageText(response.messages)?.trim();

    return { answer, agentTrace, toolExecutions };
  }
}

export function extractLastMessageText(
  messages: BaseMessage[],
): string | undefined {
  const lastMessage = messages[messages.length - 1];
  let result: string | undefined = undefined;

  if (lastMessage) {
    if (typeof lastMessage.content === "string") {
      result = lastMessage.content;
    } else if (Array.isArray(lastMessage.content)) {
      const lastTextBlock = lastMessage.content.findLast(
        (item) => typeof item === "object" && item !== null && "text" in item,
      )?.text;

      result = lastTextBlock ? String(lastTextBlock) : undefined;
    }
  }

  return result;
}

export function extractAgentTrace(
  messages: BaseMessage[],
): AgentTraceMessage[] {
  const agentTrace: AgentTraceMessage[] = [];

  for (const message of messages) {
    if (message instanceof AIMessage) {
      agentTrace.push(...extractAgentTraceTexts(message));
    } else if (message instanceof ToolMessage) {
      agentTrace.push(extractAgentTraceToolResult(message));
    }
  }

  return agentTrace;
}

export function extractToolExecutions(
  messages: BaseMessage[],
): ToolExecution[] {
  const toolExecutionsMap = new Map<string, ToolExecution>();

  // Collect tool calls and results from agent conversation
  for (const message of messages) {
    if (message instanceof AIMessage) {
      for (const toolCall of message.tool_calls || []) {
        const toolCallId = toolCall.id || randomUUID();
        toolExecutionsMap.set(toolCallId, {
          tool: toolCall.name,
          input: JSON.stringify(toolCall.args),
          output: "Not executed",
        });
      }
    } else if (message instanceof ToolMessage) {
      const toolCallId = message.tool_call_id || randomUUID();
      const existing = toolExecutionsMap.get(toolCallId);

      if (existing) {
        toolExecutionsMap.set(toolCallId, {
          ...existing,
          output: message.content ? String(message.content) : "Unknown result",
        });
      } else {
        toolExecutionsMap.set(toolCallId, {
          tool: message.name || "Unknown tool",
          input: "Unknown arguments",
          output: message.content ? String(message.content) : "Unknown result",
        });
      }
    }
  }

  return Array.from(toolExecutionsMap.values());
}

function extractAgentTraceTexts(message: AIMessage): AgentTraceMessage[] {
  const result: AgentTraceMessage[] = [];

  if (typeof message.content === "string") {
    if (message.content.trim()) {
      result.push({
        type: AgentTraceMessageType.TEXT,
        content: message.content,
      });
    }
  } else if (Array.isArray(message.content)) {
    for (const block of message.content) {
      if (typeof block !== "object" || block === null) continue;

      let text: unknown;

      if ("text" in block) {
        text = block.text;
      } else if ("reasoningText" in block) {
        const reasoningText = block.reasoningText;

        if (
          reasoningText &&
          typeof reasoningText === "object" &&
          "text" in reasoningText
        ) {
          text = reasoningText.text;
        }
      }

      if (text) {
        result.push({
          type: AgentTraceMessageType.TEXT,
          content: String(text),
        });
      }
    }
  }

  for (const toolCall of message.tool_calls || []) {
    result.push({
      type: AgentTraceMessageType.TOOL_CALL,
      toolName: toolCall.name,
      input: prettifyJson(toolCall.args),
    });
  }

  return result;
}

function extractAgentTraceToolResult(message: ToolMessage): AgentTraceMessage {
  const toolName = message.name || "Unknown tool";
  const rawToolOutput = message.content;
  let toolOutput: string;

  if (typeof rawToolOutput === "string") {
    let parsedToolOutput;

    try {
      parsedToolOutput = JSON.parse(String(rawToolOutput));
      toolOutput = prettifyJson(parsedToolOutput);
    } catch {
      toolOutput = rawToolOutput;
    }
  } else {
    toolOutput = String(rawToolOutput);
  }

  return {
    type: AgentTraceMessageType.TOOL_RESULT,
    toolName,
    output: toolOutput,
  };
}

function prettifyJson(object: object) {
  return JSON.stringify(object, null, 2);
}
