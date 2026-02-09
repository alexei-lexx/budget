import { randomUUID } from "crypto";
import { ChatBedrockConverse } from "@langchain/aws";
import { AIMessage, StructuredTool, ToolMessage, createAgent } from "langchain";
import { AIAgent, AiMessage, ToolExecution } from "../models/ai-agent";
import {
  createBedrockRuntimeClient,
  loadBedrockMaxTokens,
  loadBedrockModelId,
  loadBedrockRegion,
  loadBedrockTemperature,
} from "../utils/bedrock-runtime-client";

export class LangchainBedrockAgent implements AIAgent {
  private model: ChatBedrockConverse;

  constructor(
    private readonly tools: StructuredTool[],
    model?: ChatBedrockConverse,
  ) {
    // Create Bedrock model via LangChain
    this.model =
      model ??
      new ChatBedrockConverse({
        model: loadBedrockModelId(),
        region: loadBedrockRegion(),
        maxTokens: loadBedrockMaxTokens(),
        temperature: loadBedrockTemperature(),
        client: createBedrockRuntimeClient(),
      });
  }

  async call(messages: readonly AiMessage[], systemPrompt?: string) {
    // Create ReAct agent with tools
    const react = createAgent({
      model: this.model,
      tools: this.tools,
      systemPrompt,
    });

    const response = await react.invoke({
      messages: messages.map((msg) => ({
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
      answer =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : String(lastMessage.content);
    }

    return { answer, toolExecutions: Array.from(toolExecutionsMap.values()) };
  }
}
