import { z } from "zod";

/**
 * Generic hydration function for validating and transforming database records
 */
export function hydrate<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}
