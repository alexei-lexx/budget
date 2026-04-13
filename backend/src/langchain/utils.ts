import { AIMessage, BaseMessage, ToolMessage } from "langchain";
import { AgentTraceMessage, AgentTraceMessageType } from "../ports/agent-types";

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

export function extractAgentTraceTexts(
  message: AIMessage,
): AgentTraceMessage[] {
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

export function extractAgentTraceToolResult(
  message: ToolMessage,
): AgentTraceMessage {
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
