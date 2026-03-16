import { randomUUID } from "crypto";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, ToolMessage, createAgent, tool } from "langchain";
import {
  Agent,
  AgentMessage,
  AgentTraceMessage,
  AgentTraceMessageType,
  ToolExecution,
  ToolSignature,
} from "../services/ports/agent";

export class ReActAgent implements Agent {
  constructor(private model: BaseChatModel) {}

  async call(input: {
    messages: readonly AgentMessage[];
    systemPrompt?: string;
    tools?: readonly ToolSignature<any, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  }) {
    const langchainTools = input.tools && this.convertTools(input.tools);

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
    const agentTrace: AgentTraceMessage[] = [];

    // Collect tool calls and results from agent conversation
    for (let index = 0; index < response.messages.length; index++) {
      const message = response.messages[index];

      console.debug(`Message[${index}]`, JSON.stringify(message, null, 2));

      if (message instanceof AIMessage) {
        agentTrace.push(...this.extractAgentTraceTexts(message));

        for (const toolCall of message.tool_calls || []) {
          const toolCallId = toolCall.id || randomUUID();
          toolExecutionsMap.set(toolCallId, {
            tool: toolCall.name,
            input: JSON.stringify(toolCall.args),
            output: "Not executed",
          });
        }
      } else if (message instanceof ToolMessage) {
        agentTrace.push(this.extractAgentTraceToolResult(message));

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
        const lastTextBlock = lastMessage.content.findLast(
          (item) => "text" in item,
        )?.text;
        answer = String(lastTextBlock || "");
      }
    }

    return {
      answer,
      toolExecutions: Array.from(toolExecutionsMap.values()),
      agentTrace,
    };
  }

  private extractAgentTraceTexts(message: AIMessage): AgentTraceMessage[] {
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
        input: this.prettifyJson(toolCall.args),
      });
    }

    return result;
  }

  private extractAgentTraceToolResult(message: ToolMessage): AgentTraceMessage {
    const toolName = message.name || "Unknown tool";
    const rawToolOutput = message.content;
    let toolOutput: string;

    if (typeof rawToolOutput === "string") {
      let parsedToolOutput;

      try {
        parsedToolOutput = JSON.parse(String(rawToolOutput));
        toolOutput = this.prettifyJson(parsedToolOutput);
      } catch {
        toolOutput = rawToolOutput;
      }
    } else {
      toolOutput = String(rawToolOutput);
    }

    return {
      type: AgentTraceMessageType.TOOL_RESULT,
      toolName: toolName,
      output: toolOutput,
    };
  }

  private convertTools(tools: readonly ToolSignature<unknown, unknown>[]) {
    return tools.map((toolSignature) => {
      return tool(toolSignature.func, {
        name: toolSignature.name,
        description: toolSignature.description,
        schema: toolSignature.inputSchema,
      });
    });
  }

  private prettifyJson(object: object) {
    return JSON.stringify(object, null, 2);
  }
}
