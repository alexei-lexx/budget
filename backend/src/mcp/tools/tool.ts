import { Result } from "ts-result";
import { z } from "zod";

export interface Tool<TInput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  run(input: TInput): Promise<Result<unknown>>;
}
