import { z } from "zod";
import type { UserData } from "../../models/user";
import { toDateTimeString } from "../../types/date-time-string";

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email().lowercase(),
  interfaceLanguage: z.string().optional(),
  mcpToken: z.string().min(1),
  transactionPatternsLimit: z.number().optional(),
  voiceInputLanguage: z.string().optional(),
  createdAt: z.iso.datetime().transform(toDateTimeString),
  updatedAt: z.iso.datetime().transform(toDateTimeString),
}) satisfies z.ZodType<UserData>;
