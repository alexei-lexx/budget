import { randomUUID } from "crypto";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, ToolMessage, createAgent, tool } from "langchain";
import {
  Agent,
  AgentMessage,
  ToolExecution,
  ToolSignature,
} from "../models/agent";

export class ReActAgent implements Agent {
  constructor(private model: BaseChatModel) {}

  async call(input: {
    messages: readonly AgentMessage[];
    systemPrompt?: string;
    tools?: readonly ToolSignature<any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  }) {
    const langchainTools = input.tools?.map((toolSignature) => {
      return tool(toolSignature.func, {
        name: toolSignature.name,
        description: toolSignature.description,
        schema: toolSignature.inputSchema,
      });
    });

    // Create ReAct agent with tools
    const react = createAgent({
      model: this.model,
      tools: langchainTools,
      systemPrompt: input.systemPrompt,
    });

    const response = await react.invoke({
      messages: input.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    // Extract tool executions for user-facing summary
    const toolExecutionsMap = new Map<string, ToolExecution>();

    // Collect tool calls and results from agent conversation
    for (const message of response.messages) {
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
            output: message.content
              ? String(message.content)
              : "Unknown result",
          });
        } else {
          toolExecutionsMap.set(toolCallId, {
            tool: message.name || "Unknown tool",
            input: "Unknown arguments",
            output: message.content
              ? String(message.content)
              : "Unknown result",
          });
        }
      }
    }

    // Extract final answer from agent messages
    const lastMessage = response.messages[response.messages.length - 1];
    let answer = "";

    if (lastMessage && lastMessage.content) {
      if (typeof lastMessage.content === "string") {
        answer = lastMessage.content;
      } else if (Array.isArray(lastMessage.content)) {
        answer = lastMessage.content
          .map((item) => {
            if ("text" in item) {
              return item.text;
            } else if (
              "reasoningText" in item &&
              typeof item["reasoningText"] === "object" &&
              item["reasoningText"] !== null &&
              "text" in item["reasoningText"]
            ) {
              return item["reasoningText"].text;
            } else {
              return JSON.stringify(item);
            }
          })
          .join("\n");
      }
    }

    return { answer, toolExecutions: Array.from(toolExecutionsMap.values()) };
  }
}
