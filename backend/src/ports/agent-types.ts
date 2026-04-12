export interface AgentMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolExecution {
  tool: string;
  input: string;
  output: string;
}

export interface AgentSkill {
  name: string;
  description: string;
  prompt: string;
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
