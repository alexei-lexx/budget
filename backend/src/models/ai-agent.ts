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
    toolContext?: Record<string, unknown>,
  ): Promise<{ answer: string; toolExecutions?: ToolExecution[] }>;
}
