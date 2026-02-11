import { StructuredTool } from "langchain";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolExecution {
  tool: string;
  input: string;
  output: string;
}

export interface AIAgent {
  call(
    messages: readonly AiMessage[],
    systemPrompt?: string,
  ): Promise<{ answer: string; toolExecutions?: ToolExecution[] }>;
}

export interface AIAgentFactory {
  createAgent(tools: readonly StructuredTool[]): AIAgent;
}
