export interface AgentMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolExecution {
  tool: string;
  input: string;
  output: string;
}

interface AgentTraceText {
  type: "TEXT";
  content: string;
}

interface AgentTraceToolCall {
  type: "TOOL_CALL";
  toolName: string;
  input: string;
}

interface AgentTraceToolResult {
  type: "TOOL_RESULT";
  toolName: string;
  output: string;
}

export type AgentTraceMessage =
  AgentTraceText | AgentTraceToolCall | AgentTraceToolResult;

export type AgentTraceMessageType = AgentTraceMessage["type"];

export interface Agent<TContext extends Record<string, unknown>> {
  invoke(
    state: { messages: readonly AgentMessage[] },
    config: { context: TContext },
  ): Promise<{
    answer?: string;
    agentTrace: AgentTraceMessage[];
    toolExecutions: ToolExecution[];
  }>;
}
