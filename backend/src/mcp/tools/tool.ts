import { z } from "zod";
import { Result } from "../../types/result";

export interface Tool<TInput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  run(input: TInput): Promise<Result<unknown>>;
}
