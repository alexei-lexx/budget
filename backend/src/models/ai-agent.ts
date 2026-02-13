import { z } from "zod";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolSignature<TInput> {
  name: string;
  description: string;
  func: (input: TInput) => string;
  inputSchema: z.ZodType<TInput>;
}

// Type alias for arrays of heterogeneous tools
// Using `any` here is safe because runtime validation is done via Zod schemas
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyToolSignature = ToolSignature<any>;

export interface ToolExecution {
  tool: string;
  input: string;
  output: string;
}

export interface AIAgent {
  call(input: {
    messages: readonly AiMessage[];
    systemPrompt?: string;
    tools?: readonly AnyToolSignature[];
  }): Promise<{ answer: string; toolExecutions?: ToolExecution[] }>;
}
