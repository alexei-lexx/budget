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

export interface Agent {
  call(input: {
    messages: readonly AgentMessage[];
    systemPrompt?: string;
    tools?: readonly ToolSignature<any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  }): Promise<{ answer: string; toolExecutions?: ToolExecution[] }>;
}
