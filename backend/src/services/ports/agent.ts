import { z } from "zod";

export interface AgentMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolSignature<TInput> {
  name: string;
  description: string;
  func: (input: TInput) => Promise<string>;
  inputSchema: z.ZodType<TInput>;
}

export interface ToolExecution {
  tool: string;
  input: string;
  output: string;
}

export enum AgentTraceMessageType {
  TEXT = "TEXT",
  TOOL_CALL = "TOOL_CALL",
  TOOL_RESULT = "TOOL_RESULT",
}

interface AgentTraceText {
  type: AgentTraceMessageType.TEXT;
  content: string;
}

interface AgentTraceToolCall {
  type: AgentTraceMessageType.TOOL_CALL;
  toolName: string;
  input: string;
}

interface AgentTraceToolResult {
  type: AgentTraceMessageType.TOOL_RESULT;
  toolName: string;
  output: string;
}

export type AgentTraceMessage =
  | AgentTraceText
  | AgentTraceToolCall
  | AgentTraceToolResult;

export interface Agent {
  call(input: {
    messages: readonly AgentMessage[];
    systemPrompt?: string;
    tools?: readonly ToolSignature<any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  }): Promise<{
    answer: string;
    toolExecutions?: ToolExecution[];
    agentTrace: AgentTraceMessage[];
  }>;
}
